-- Datelog: The Crowd — demographics + 10 clearly-labeled EXAMPLE posts.
-- Apply AFTER community.sql, in the Supabase SQL editor. Idempotent (safe to re-run).

-- (a) new nullable columns
alter table public.community_posts add column if not exists age_band   text;
alter table public.community_posts add column if not exists gender     text;
alter table public.community_posts add column if not exists seeking    text;
alter table public.community_posts add column if not exists is_example boolean not null default false;
alter table public.community_posts add column if not exists ex_weekday smallint;   -- examples: 0=Sun..6=Sat, day label rolls forward
alter table public.community_posts drop constraint if exists cp_age_chk;
alter table public.community_posts add  constraint cp_age_chk check (age_band is null or age_band in ('20–24','25–29','30–34','35–39','40–49','50+'));
alter table public.community_posts drop constraint if exists cp_gender_chk;
alter table public.community_posts add  constraint cp_gender_chk check (gender is null or gender in ('Woman','Man','Nonbinary'));
alter table public.community_posts drop constraint if exists cp_seeking_chk;
alter table public.community_posts add  constraint cp_seeking_chk check (seeking is null or seeking in ('Woman','Man','Nonbinary','Anyone'));
alter table public.community_posts drop constraint if exists cp_exwd_chk;
alter table public.community_posts add  constraint cp_exwd_chk check (ex_weekday is null or ex_weekday between 0 and 6);
-- allow up to 20 chars at table level (examples like "Divorced Dad of 2"); user posts stay capped at 16 by post_community
alter table public.community_posts drop constraint if exists cp_nick_chk;
alter table public.community_posts add  constraint cp_nick_chk check (char_length(btrim(nick)) between 1 and 20 and nick !~ '[@/:<>]' and nick !~ '\d{3}');

-- (b) list_community: new columns; examples never expire and get a rolling day label; real posts first
drop function if exists public.list_community(text);
create function public.list_community(p_voter text default null)
returns table (id uuid, nick text, date_type text, area text, day_label text, met text, excite smallint, outcome text,
               yes_votes int, no_votes int, my_pick text, created_at timestamptz,
               age_band text, gender text, seeking text, is_example boolean)
language sql security definer set search_path = public stable as $$
  with t as (select (now() at time zone 'America/Los_Angeles')::date as d)
  select p.id, p.nick, p.date_type, p.area,
         case when p.is_example and p.ex_weekday is not null then
           (select case ((p.ex_weekday - extract(dow from t.d)::int + 7) % 7)
                     when 0 then 'today' when 1 then 'tomorrow'
                     else trim(to_char(t.d + ((p.ex_weekday - extract(dow from t.d)::int + 7) % 7), 'Day')) end from t)
         else p.day_label end,
         p.met, p.excite, p.outcome,
         (select count(*)::int from community_votes v where v.post_id = p.id and v.pick = 'yes'),
         (select count(*)::int from community_votes v where v.post_id = p.id and v.pick = 'no'),
         (select v.pick from community_votes v where v.post_id = p.id and v.voter_id = p_voter),
         p.created_at, p.age_band, p.gender, p.seeking, p.is_example
  from community_posts p
  where p.is_example or p.expires_at > now()
  order by p.is_example, (p.outcome is not null), p.created_at desc
  limit 100;
$$;
revoke all on function public.list_community(text) from public;
grant execute on function public.list_community(text) to anon, authenticated;

-- (c) post_community: optional age band / gender / seeking (old 8-arg version replaced)
drop function if exists public.post_community(text,text,text,text,text,int,int,text);
drop function if exists public.post_community(text,text,text,text,text,int,int,text,text,text,text);
create function public.post_community(p_nick text, p_type text, p_area text, p_day text, p_met text, p_excite int, p_days_until int, p_poster text,
                                      p_age text default null, p_gender text default null, p_seeking text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tok text;
begin
  p_nick := btrim(coalesce(p_nick,''));
  if char_length(p_nick) < 1 or char_length(p_nick) > 16 or p_nick ~ '[@/:<>]' or p_nick ~ '\d{3}' or p_nick ~* '(https?|www\.)' then raise exception 'bad nick' using errcode='22023'; end if;
  if p_days_until is null or p_days_until < 0 or p_days_until > 21 then raise exception 'bad day' using errcode='22023'; end if;
  if p_poster is null or p_poster !~ '^[0-9a-f]{16,64}$' or p_poster = repeat('0',32) then raise exception 'bad poster' using errcode='22023'; end if;
  if (select count(*) from community_posts where poster_id = p_poster and created_at > now() - interval '1 day') >= 5 then raise exception 'rate limit' using errcode='P0001'; end if;
  if (select count(*) from community_posts where created_at > now() - interval '1 day' and not is_example) >= 1000 then raise exception 'busy' using errcode='P0001'; end if;
  v_tok := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into community_posts (token_hash, poster_id, nick, date_type, area, day_label, met, excite, expires_at, age_band, gender, seeking, is_example)
  values (encode(sha256(convert_to(v_tok,'UTF8')),'hex'), p_poster, p_nick, p_type, p_area, p_day, p_met, p_excite,
          date_trunc('day', now()) + make_interval(days => p_days_until + 4), nullif(p_age,''), nullif(p_gender,''), nullif(p_seeking,''), false)
  returning id into v_id;
  return json_build_object('id', v_id, 'token', v_tok);
end $$;
revoke all on function public.post_community(text,text,text,text,text,int,int,text,text,text,text) from public;
grant execute on function public.post_community(text,text,text,text,text,int,int,text,text,text,text) to anon, authenticated;

-- (d) examples can't be resolved or deleted through the public RPCs
create or replace function public.resolve_community(p_post uuid, p_token text, p_outcome text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_outcome not in ('yes','no') then raise exception 'bad outcome' using errcode='22023'; end if;
  update community_posts set outcome = p_outcome, resolved_at = now(), expires_at = greatest(expires_at, now() + interval '3 days')
   where id = p_post and not is_example and token_hash = encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');
  return found;
end $$;
create or replace function public.delete_community(p_post uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from community_posts where id = p_post and not is_example and token_hash = encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');
  return found;
end $$;

-- (e) the 10 example posts (fictional; shown with an "Example" tag). Token is random and discarded.
insert into public.community_posts (token_hash, poster_id, nick, date_type, area, day_label, met, excite, expires_at, age_band, gender, seeking, is_example, ex_weekday)
select encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'), repeat('0',32), x.nick, x.ty, x.area, 'this week', x.met, x.ex, 'infinity', x.age, x.g, x.s, true, x.wd
from (values
  ('The Architect',     'coffee',   'West LA',              'Hinge',     4::smallint, '30–34', 'Woman',     'Man',       5::smallint),
  ('Marathon Guy',      'activity', 'Santa Monica',         'Bumble',    3, '25–29', 'Man',       'Woman',     6),
  ('Plant Mom',         'coffee',   'Silver Lake/Echo Park','Hinge',     5, '25–29', 'Woman',     'Woman',     0),
  ('The Sommelier',     'drinks',   'Hollywood',            'Raya',      4, '40–49', 'Man',       'Man',       4),
  ('DJ Weekends',       'drinks',   'Downtown',             'In person', 3, '20–24', 'Woman',     'Man',          5),
  ('The Surgeon',       'dinner',   'Pasadena',             'Set up',    2, '35–39', 'Woman',     'Man',       3),
  ('Pickleball Pro',    'activity', 'South Bay',            'In person', 4, '50+',   'Man',       'Woman',     6),
  ('Bookshop Babe',     'coffee',   'Mid-City',             'Bumble',    4, '30–34', 'Woman',     'Man',       2),
  ('The Comedian',      'activity', 'Hollywood',            'At work',   5, '25–29', 'Man',       'Woman',       4),
  ('Divorced Dad of 2', 'dinner',   'Valley',               'Hinge',     3, '40–49', 'Man',       'Woman',     0)
) as x(nick, ty, area, met, ex, age, g, s, wd)
where not exists (select 1 from public.community_posts c where c.is_example and c.nick = x.nick);
