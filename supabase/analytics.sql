-- Datelog: first-party, anonymous usage counting. Apply in the Supabase SQL editor. Idempotent.
-- Stores ONLY: a random per-browser id (localStorage, no PII), an event name, and a timestamp. Never date contents.
create table if not exists public.app_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  anon_id    text not null check (anon_id ~ '^[0-9a-f]{32}$'),
  event      text not null check (event in ('visit','log_date','log_upcoming','crowd_post','crowd_vote','friend_guess','share','reveal'))
);
create index if not exists app_events_anon_time on public.app_events (anon_id, created_at desc);
create index if not exists app_events_time on public.app_events (created_at desc);
alter table public.app_events enable row level security;          -- no policies => no direct anon/auth access at all
revoke all on table public.app_events from anon, authenticated;

-- write path: fire-and-forget from the app
create or replace function public.track_event(p_anon_id text, p_event text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_anon_id is null or p_anon_id !~ '^[0-9a-f]{32}$' then raise exception 'bad id' using errcode='22023'; end if;
  if p_event not in ('visit','log_date','log_upcoming','crowd_post','crowd_vote','friend_guess','share','reveal') then raise exception 'bad event' using errcode='22023'; end if;
  if (select count(*) from app_events where anon_id = p_anon_id and created_at > now() - interval '1 hour') >= 60 then return false; end if;
  if p_event = 'visit' and exists (select 1 from app_events where anon_id = p_anon_id and event = 'visit' and created_at > now() - interval '30 minutes') then return false; end if;
  if (select count(*) from app_events where created_at > now() - interval '1 hour') >= 20000 then return false; end if;  -- global flood guard
  insert into app_events (anon_id, event) values (p_anon_id, p_event);
  return true;
end $$;
revoke all on function public.track_event(text,text) from public;
grant execute on function public.track_event(text,text) to anon, authenticated;

-- public, aggregate-only counts (no rows, no ids) for the recap script
create or replace function public.usage_counts()
returns json language sql security definer set search_path = public stable as $$
  with w(label, since) as (values ('24h', now() - interval '24 hours'), ('7d', now() - interval '7 days'), ('all', '-infinity'::timestamptz))
  select json_object_agg(w.label, (
    select json_build_object(
      'unique_visitors', count(distinct e.anon_id),
      'events', coalesce((select json_object_agg(x.event, x.n) from (select event, count(*) n from app_events where created_at >= w.since group by event) x), '{}'::json))
    from app_events e where e.created_at >= w.since))
  from w;
$$;
revoke all on function public.usage_counts() from public;
grant execute on function public.usage_counts() to anon, authenticated;

-- OWNER-ONLY detail (SQL editor / service role): per-day breakdown
create or replace function public.usage_summary(p_since timestamptz default now() - interval '7 days')
returns table (day date, unique_visitors bigint, visits bigint, log_date bigint, log_upcoming bigint, crowd_post bigint,
               crowd_vote bigint, friend_guess bigint, share bigint, reveal bigint, new_visitors bigint)
language sql security definer set search_path = public stable as $$
  with f as (select anon_id, (min(created_at) at time zone 'America/Los_Angeles')::date first_day from app_events group by anon_id),
       e as (select anon_id, event, (created_at at time zone 'America/Los_Angeles')::date d from app_events where created_at >= p_since),
       n as (select first_day d, count(*) c from f group by 1)
  select e.d, count(distinct e.anon_id),
         count(*) filter (where event='visit'), count(*) filter (where event='log_date'), count(*) filter (where event='log_upcoming'),
         count(*) filter (where event='crowd_post'), count(*) filter (where event='crowd_vote'), count(*) filter (where event='friend_guess'),
         count(*) filter (where event='share'), count(*) filter (where event='reveal'),
         coalesce(max(n.c), 0)::bigint
  from e left join n on n.d = e.d
  group by e.d order by e.d desc;
$$;
revoke all on function public.usage_summary(timestamptz) from public, anon, authenticated;
-- usage:  select * from usage_summary();   or   select * from usage_summary(now() - interval '30 days');
