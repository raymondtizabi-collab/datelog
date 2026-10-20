-- Datelog Supabase schema. Idempotent: safe to run more than once in the SQL editor.
-- Clients use only the publishable (anon) key. Anon can INSERT into both tables,
-- but cannot SELECT/UPDATE/DELETE them directly. Reads go through SECURITY DEFINER RPCs.

create extension if not exists pgcrypto;

-- ============ (a) call_guesses: friends' "Call it" guesses ============
create table if not exists public.call_guesses (
  id          uuid primary key default gen_random_uuid(),
  call_id     text not null,
  friend_name text not null,
  guess       jsonb not null,
  created_at  timestamptz not null default now()
);

-- (re)apply constraints idempotently
alter table public.call_guesses drop constraint if exists call_guesses_call_id_chk;
alter table public.call_guesses add  constraint call_guesses_call_id_chk
  check (call_id ~ '^[0-9a-f]{32,64}$');                       -- >=128-bit random hex id
alter table public.call_guesses drop constraint if exists call_guesses_friend_chk;
alter table public.call_guesses add  constraint call_guesses_friend_chk
  check (char_length(btrim(friend_name)) between 1 and 30);
alter table public.call_guesses drop constraint if exists call_guesses_guess_chk;
alter table public.call_guesses add  constraint call_guesses_guess_chk check (
  jsonb_typeof(guess) = 'object'
  and pg_column_size(guess) <= 1024
  and (guess - array['p2','pw','pm','take']) = '{}'::jsonb      -- no unexpected keys
  and guess->>'p2' in ('yes','no')
  and (guess->>'pw') ~ '^[1-5]$'
  and guess->>'pm' in ('you','them','both','neither')
  and (not guess ? 'take' or (jsonb_typeof(guess->'take') = 'string' and char_length(guess->>'take') <= 80))
);

create index if not exists call_guesses_call_id_idx on public.call_guesses (call_id, created_at);

alter table public.call_guesses enable row level security;
revoke all on public.call_guesses from anon, authenticated;
grant insert (call_id, friend_name, guess) on public.call_guesses to anon, authenticated;

-- soft flood guard helper (security definer: anon itself has no SELECT on the table)
create or replace function public.call_guess_count(p_call_id text)
returns integer language sql security definer set search_path = public stable as $$
  select count(*)::int from public.call_guesses where call_id = p_call_id
$$;
revoke all on function public.call_guess_count(text) from public;
grant execute on function public.call_guess_count(text) to anon, authenticated;

drop policy if exists call_guesses_insert on public.call_guesses;
create policy call_guesses_insert on public.call_guesses
  for insert to anon, authenticated
  with check (public.call_guess_count(call_id) < 50);   -- at most 50 guesses per call id
-- no SELECT/UPDATE/DELETE policies => direct reads/changes are denied

-- Read guesses only when you already know the unguessable call_id.
create or replace function public.get_guesses(p_call_id text)
returns table (friend_name text, guess jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select g.friend_name, g.guess, g.created_at
  from public.call_guesses g
  where p_call_id ~ '^[0-9a-f]{32,64}$'
    and g.call_id = p_call_id
  order by g.created_at
  limit 50;
$$;
revoke all on function public.get_guesses(text) from public;
grant execute on function public.get_guesses(text) to anon, authenticated;

-- ============ (b) pooled_dates: anonymous, aggregate-only rows ============
create table if not exists public.pooled_dates (
  id          uuid primary key default gen_random_uuid(),
  row_id      uuid not null unique,          -- random per-date id generated on device (dedupe)
  month       text not null,                 -- 'YYYY-MM' only, never an exact date
  date_num    smallint not null,
  date_type   text not null,
  met         text not null,
  channel     text not null,
  excite      smallint, went smallint, rating smallint,
  mine        text, theirs text, second text,
  cat_looks smallint, cat_personality smallint, cat_conversation smallint,
  cat_humor smallint, cat_chemistry smallint, cat_values smallint,
  spend_bucket text, paid text, exp_paid text,
  draw text[] not null default '{}', hoping text[] not null default '{}',
  concerns text[] not null default '{}', why text[] not null default '{}', they text[] not null default '{}',
  age_band text, gender text, city text,
  created_at  timestamptz not null default now()
);

alter table public.pooled_dates drop constraint if exists pooled_dates_chk;
alter table public.pooled_dates add constraint pooled_dates_chk check (
      month ~ '^20[2-9][0-9]-(0[1-9]|1[0-2])$'
  and date_num between 1 and 50
  and date_type in ('coffee','drinks','dinner','activity','other')
  and met in ('Hinge','Bumble','Tinder','Raya','Other app','In person','At work','Set up','Other')
  and channel in ('Online','In person','Other')
  and (excite is null or excite between 1 and 5)
  and (went   is null or went   between 1 and 5)
  and (rating is null or rating between 1 and 5)
  and (mine   is null or mine   in ('yes','maybe','no'))
  and (theirs is null or theirs in ('yes','unknown','no'))
  and (second is null or second in ('not yet','yes','no'))
  and (cat_looks        is null or cat_looks        between 1 and 5)
  and (cat_personality  is null or cat_personality  between 1 and 5)
  and (cat_conversation is null or cat_conversation between 1 and 5)
  and (cat_humor        is null or cat_humor        between 1 and 5)
  and (cat_chemistry    is null or cat_chemistry    between 1 and 5)
  and (cat_values       is null or cat_values       between 1 and 5)
  and (spend_bucket is null or spend_bucket in ('$0','$1-25','$26-50','$51-100','$101-200','$200+'))
  and (paid     is null or paid     in ('I paid','They paid','Split','Not sure'))
  and (exp_paid is null or exp_paid in ('I will','They will','Split','Not sure'))
  and (age_band is null or age_band in ('25–29','30–34','35–39','40+'))
  and (gender   is null or gender   in ('Woman','Man','Nonbinary'))
  and (city     is null or city     in ('Los Angeles'))
  -- arrays: bounded size; contents are restricted to fixed labels by pooled_dates_labels_chk
  and cardinality(draw) <= 12 and cardinality(hoping) <= 12 and cardinality(concerns) <= 12
  and cardinality(why) <= 12 and cardinality(they) <= 12
  and pg_column_size(draw) + pg_column_size(hoping) + pg_column_size(concerns)
      + pg_column_size(why) + pg_column_size(they) <= 2048
);

-- array items must come from the app's fixed option lists
drop function if exists public.pool_labels_ok(text[], text[]);

alter table public.pooled_dates drop constraint if exists pooled_dates_labels_chk;
alter table public.pooled_dates add constraint pooled_dates_labels_chk check (
      draw <@ array['Looks','Banter/chat','Their profile','Shared interests','Mutual friends','Vibe in person','Not sure','Other']::text[]
  and hoping <@ array['Fun night','Chemistry check','Relationship potential','Just casual','Not sure']::text[]
  and concerns <@ array['Looks different than photos','Nothing to talk about','Red flag from chat','Safety','They''re not serious','Too nervous','None','Other']::text[]
  and why <@ array['No chemistry','Not physically attracted','Conversation fell flat','Different goals or values','Looked different than photos','Red flag','Too far / bad timing','Into someone else','Other']::text[]
  and they <@ array['No chemistry','Not their type','I was too nervous / off night','Different goals','They''re seeing someone else','Bad timing','They ghosted / no idea','Other']::text[]
);

alter table public.pooled_dates enable row level security;
revoke all on public.pooled_dates from anon, authenticated;
grant insert (row_id, month, date_num, date_type, met, channel, excite, went, rating, mine, theirs, second,
  cat_looks, cat_personality, cat_conversation, cat_humor, cat_chemistry, cat_values,
  spend_bucket, paid, exp_paid, draw, hoping, concerns, why, they, age_band, gender, city)
  on public.pooled_dates to anon, authenticated;

drop policy if exists pooled_dates_insert on public.pooled_dates;
create policy pooled_dates_insert on public.pooled_dates
  for insert to anon, authenticated with check (true);
-- no SELECT/UPDATE/DELETE policies

-- Aggregates only; any group with fewer than 5 rows is suppressed.
create or replace function public.pooled_summary()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
with base as (select * from public.pooled_dates),
first_dates as (select * from base where date_num = 1 and second in ('yes','no')),
by_type as (
  select date_type k, count(*) n, round(100.0 * avg((second = 'yes')::int)) rate
  from first_dates group by date_type having count(*) >= 5),
by_channel as (
  select channel k, count(*) n, round(100.0 * avg((second = 'yes')::int)) rate
  from first_dates group by channel having count(*) >= 5),
cats as (
  select k, count(v) n, round(avg(v)::numeric, 2) a from (
    select 'looks' k, cat_looks v from base union all
    select 'personality', cat_personality from base union all
    select 'conversation', cat_conversation from base union all
    select 'humor', cat_humor from base union all
    select 'chemistry', cat_chemistry from base union all
    select 'values', cat_values from base) t
  where v is not null group by k having count(v) >= 5),
spend as (
  select date_type k, count(*) n,
    round(avg(case spend_bucket when '$0' then 0 when '$1-25' then 13 when '$26-50' then 38
      when '$51-100' then 75 when '$101-200' then 150 when '$200+' then 250 end)) a
  from base where spend_bucket is not null group by date_type having count(*) >= 5)
select jsonb_build_object(
  'n',        (select count(*) from base),
  'second_n', (select count(*) from first_dates),
  'second_rate', case when (select count(*) from first_dates) >= 5
                 then (select round(100.0 * avg((second = 'yes')::int)) from first_dates) end,
  'by_type',    coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'rate', rate)) from by_type), '{}'),
  'by_channel', coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'rate', rate)) from by_channel), '{}'),
  'cats',       coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'avg', a)) from cats), '{}'),
  'spend',      coalesce((select jsonb_object_agg(k, jsonb_build_object('n', n, 'avg', a)) from spend), '{}')
);
$$;
revoke all on function public.pooled_summary() from public;
grant execute on function public.pooled_summary() to anon, authenticated;
