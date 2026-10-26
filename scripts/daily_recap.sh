#!/usr/bin/env bash
# Datelog daily recap using only the public (anon) key: aggregate counts, no rows, no ids.
#   bash scripts/daily_recap.sh
# Usage numbers need supabase/analytics.sql applied (usage_counts RPC). Per-day detail is owner-only:
#   run  select * from usage_summary();  in the Supabase SQL editor.
set -u
URL=https://gjtpiszuadcvsxblmogt.supabase.co; KEY=sb_publishable_YaqJwehqSogqINz5Q1vFHA_4ZA-2uKM
rpc(){ curl -s -o "$2" -w '%{http_code}' -X POST "$URL/rest/v1/rpc/$1" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{}'; }
U=$(rpc usage_counts /tmp/dr_u.json); C=$(rpc list_community /tmp/dr_c.json)
python3 - "$U" "$C" <<'PY'
import json,sys,datetime
u,c=sys.argv[1:]
print("📊 Datelog recap —",datetime.datetime.now().strftime('%a %b %-d, %-I:%M %p'),"PT")
N=['visit','log_date','log_upcoming','crowd_post','crowd_vote','friend_guess','share','reveal']
if u=='200':
    d=json.load(open('/tmp/dr_u.json'))
    for k,l in (('24h','Last 24h'),('7d','Last 7 days'),('all','All time')):
        x=d.get(k) or {};e=x.get('events') or {}
        print(f"  {l:<12} {x.get('unique_visitors',0)} people · "+" · ".join(f"{n.replace('_',' ')} {e.get(n,0)}" for n in N))
else:
    print(f"  Usage: not available (usage_counts HTTP {u}) — apply supabase/analytics.sql")
if c=='200':
    p=json.load(open('/tmp/dr_c.json'));r=[x for x in p if not x.get('is_example')];ex=[x for x in p if x.get('is_example')]
    rv=sum((x.get('yes_votes') or 0)+(x.get('no_votes') or 0) for x in r)
    print(f"  The Crowd    {len(r)} live real posts · {rv} votes on them · {sum(1 for x in r if x.get('outcome'))} resolved · {len(ex)} examples")
else:
    print(f"  The Crowd: list_community HTTP {c}")
PY
