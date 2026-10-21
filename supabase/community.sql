-- Datelog: Community Oracle (opt-in, anonymous public feed) + optional friend-guess fields.
-- Apply in the Supabase SQL editor. Idempotent: safe to run more than once.
-- Design: anon/authenticated have NO direct table access. Everything goes through
-- SECURITY DEFINER RPCs that validate enums/lengths and rate-limit.
-- Stored per post: public nickname, date type, broad LA area, day label, how-met category,
-- excitement 1-5, expiry, outcome. Never a venue, exact date/time, notes or free text.

-- ============ (a) tables ============
create table if not exists public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null,                       -- sha256 of the secret resolve/delete token
  poster_id   text not null,                       -- random per-device id (rate limiting only)
  nick        text not null,
  date_type   text not null,
  area        text not null,
  day_label   text not null,
  met         text not null,
  excite      smallint,
  outcome     text,                                -- null until resolved: 'yes' | 'no'
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  resolved_at timestamptz,
  constraint cp_nick_chk   check (char_length(btrim(nick)) between 1 and 16 and nick !~ '[@/:<>]' and nick !~ '\d{3}'),
  constraint cp_type_chk   check (date_type in ('coffee','drinks','dinner','activity','other')),
  constraint cp_area_chk   check (area in ('West LA','Santa Monica','Venice/Marina','Silver Lake/Echo Park','Downtown','Hollywood','Mid-City','Valley','South Bay','Pasadena','Other LA')),
  constraint cp_day_chk    check (day_label in ('today','tomorrow','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','this week','next week')),
  constraint cp_met_chk    check (met in ('Hinge','Bumble','Tinder','Raya','Other app','In person','At work','Set up','Other')),
  constraint cp_excite_chk check (excite is null or excite between 1 and 5),
  constraint cp_outcome_chk check (outcome is null or outcome in ('yes','no')),
  constraint cp_poster_chk check (poster_id ~ '^[0-9a-f]{16,64}$')
);
create index if not exists community_posts_active_idx on public.community_posts (expires_at desc);
create index if not exists community_posts_poster_idx on public.community_posts (poster_id, created_at);

create table if not exists public.community_votes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  voter_id   text not null,
  pick       text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_id),                 -- one vote per voter per post
  constraint cv_voter_chk check (voter_id ~ '^[0-9a-f]{16,64}$'),
  constraint cv_pick_chk  check (pick in ('yes','no'))
);
create index if not exists community_votes_voter_idx on public.community_votes (voter_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_votes enable row level security;
revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_votes from anon, authenticated;
-- no policies => no direct reads/writes for anon/authenticated

-- ============ (b) RPCs ============
-- post_community: returns {id, token}. Token is shown once; only its hash is stored.
create or replace function public.post_community(p_nick text, p_type text, p_area text, p_day text, p_met text, p_excite int, p_days_until int, p_poster text)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tok text;
begin
  p_nick := btrim(coalesce(p_nick,''));
  if char_length(p_nick) < 1 or char_length(p_nick) > 16 or p_nick ~ '[@/:<>]' or p_nick ~ '\d{3}' or p_nick ~* '(https?|www\.)' then raise exception 'bad nick' using errcode='22023'; end if;
  if p_days_until is null or p_days_until < 0 or p_days_until > 21 then raise exception 'bad day' using errcode='22023'; end if;
  if p_poster is null or p_poster !~ '^[0-9a-f]{16,64}$' then raise exception 'bad poster' using errcode='22023'; end if;
  if (select count(*) from community_posts where poster_id = p_poster and created_at > now() - interval '1 day') >= 5 then raise exception 'rate limit' using errcode='P0001'; end if;
  if (select count(*) from community_posts where created_at > now() - interval '1 day') >= 1000 then raise exception 'busy' using errcode='P0001'; end if;
  v_tok := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into community_posts (token_hash, poster_id, nick, date_type, area, day_label, met, excite, expires_at)
  values (encode(sha256(convert_to(v_tok,'UTF8')),'hex'), p_poster, p_nick, p_type, p_area, p_day, p_met, p_excite,
          date_trunc('day', now()) + make_interval(days => p_days_until + 4))   -- hides a few days after the date
  returning id into v_id;   -- enum/length checks enforced by table constraints
  return json_build_object('id', v_id, 'token', v_tok);
end $$;

-- vote_community: one vote per voter per post (re-vote is ignored), no votes once resolved/expired.
create or replace function public.vote_community(p_post uuid, p_voter text, p_pick text)
returns json language plpgsql security definer set search_path = public as $$
declare y int; n int;
begin
  if p_voter is null or p_voter !~ '^[0-9a-f]{16,64}$' or p_pick not in ('yes','no') then raise exception 'bad vote' using errcode='22023'; end if;
  if not exists (select 1 from community_posts where id = p_post and outcome is null and expires_at > now()) then raise exception 'closed' using errcode='P0001'; end if;
  if (select count(*) from community_votes where voter_id = p_voter and created_at > now() - interval '1 day') >= 200 then raise exception 'rate limit' using errcode='P0001'; end if;
  if (select count(*) from community_votes where post_id = p_post) >= 2000 then raise exception 'full' using errcode='P0001'; end if;
  insert into community_votes (post_id, voter_id, pick) values (p_post, p_voter, p_pick) on conflict do nothing;
  select count(*) filter (where pick='yes'), count(*) filter (where pick='no') into y, n from community_votes where post_id = p_post;
  return json_build_object('yes', y, 'no', n);
end $$;

-- list_community: active posts with tallies (+ the caller's own pick if p_voter given). Never returns tokens or poster ids.
create or replace function public.list_community(p_voter text default null)
returns table (id uuid, nick text, date_type text, area text, day_label text, met text, excite smallint, outcome text,
               yes_votes int, no_votes int, my_pick text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id, p.nick, p.date_type, p.area, p.day_label, p.met, p.excite, p.outcome,
         (select count(*)::int from community_votes v where v.post_id = p.id and v.pick = 'yes'),
         (select count(*)::int from community_votes v where v.post_id = p.id and v.pick = 'no'),
         (select v.pick from community_votes v where v.post_id = p.id and v.voter_id = p_voter),
         p.created_at
  from community_posts p
  where p.expires_at > now()
  order by (p.outcome is not null), p.created_at desc
  limit 100;
$$;

-- resolve_community: poster records the outcome (needs the secret token); stays visible 3 more days.
create or replace function public.resolve_community(p_post uuid, p_token text, p_outcome text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_outcome not in ('yes','no') then raise exception 'bad outcome' using errcode='22023'; end if;
  update community_posts set outcome = p_outcome, resolved_at = now(), expires_at = greatest(expires_at, now() + interval '3 days')
   where id = p_post and token_hash = encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');
  return found;
end $$;

-- delete_community: poster unposts anytime (needs the secret token). Votes cascade.
create or replace function public.delete_community(p_post uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from community_posts where id = p_post and token_hash = encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');
  return found;
end $$;

do $$ declare f text; begin
  foreach f in array array['post_community(text,text,text,text,text,int,int,text)','vote_community(uuid,text,text)','list_community(text)','resolve_community(uuid,text,text)','delete_community(uuid,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop; end $$;

-- housekeeping (optional, run anytime): purge long-expired posts
-- delete from public.community_posts where expires_at < now() - interval '30 days';

-- ============ (c) friend guesses: allow the quick "2nd date only" call ============
-- Friends can now submit just the 2nd-date pick; how-it-goes (pw) and who-wants-it-more (pm) become optional.
alter table public.call_guesses drop constraint if exists call_guesses_guess_chk;
alter table public.call_guesses add  constraint call_guesses_guess_chk check (
  jsonb_typeof(guess) = 'object'
  and pg_column_size(guess) <= 1024
  and (guess - array['p2','pw','pm','take']) = '{}'::jsonb
  and guess->>'p2' in ('yes','no')
  and (not guess ? 'pw' or (guess->>'pw') ~ '^[1-5]$')
  and (not guess ? 'pm' or guess->>'pm' in ('you','them','both','neither'))
  and (not guess ? 'take' or (jsonb_typeof(guess->'take') = 'string' and char_length(guess->>'take') <= 80))
);
