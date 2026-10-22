#!/usr/bin/env bash
# After examples.sql is applied:  bash supabase/verify_examples.sh   (read-only)
set -u
URL=https://gjtpiszuadcvsxblmogt.supabase.co; KEY=sb_publishable_YaqJwehqSogqINz5Q1vFHA_4ZA-2uKM
c=$(curl -s -o /tmp/sbe.out -w '%{http_code}' -X POST "$URL/rest/v1/rpc/list_community" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{}')
[ "$c" = 200 ] || { echo "FAIL list_community HTTP $c $(cat /tmp/sbe.out)"; exit 1; }
python3 - <<'PY'
import json,sys
d=json.load(open('/tmp/sbe.out'));ex=[p for p in d if p.get('is_example')];F=0
def chk(c,m):
    global F;print(('PASS  ' if c else 'FAIL  ')+m);F+=0 if c else 1
chk('is_example' in (d[0] if d else {'is_example':1}),'list_community returns is_example/age_band/gender/seeking')
chk(len(ex)==10,f'10 example posts listed (got {len(ex)})')
chk(all(p['age_band'] and p['gender'] and p['seeking'] for p in ex),'examples have age band, gender, seeking')
chk({p['gender'] for p in ex}=={'Woman','Man'} and sum(p['gender']=='Woman' for p in ex)==5,'examples: 5 women, 5 men posting, no nonbinary')
chk(sum(p['gender']==p['seeking'] for p in ex)==2 and all(p['seeking'] in ('Woman','Man') for p in ex),'exactly 2 same-sex, 8 man/woman')
chk(len({p['age_band'] for p in ex})>=5,'age spread')
chk(all(p['day_label'] in ('today','tomorrow','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') for p in ex),'rolling day labels')
real=[i for i,p in enumerate(d) if not p.get('is_example')];exi=[i for i,p in enumerate(d) if p.get('is_example')]
chk(not real or not exi or max(real)<min(exi),'real posts sorted before examples')
for p in ex:print(f"   Example · {p['date_type']} in {p['area']} with “{p['nick']}” · {p['day_label']} · {p['age_band']} · {p['gender']} seeking {p['seeking']} · 😍{p['yes_votes']} 💀{p['no_votes']}")
sys.exit(1 if F else 0)
PY
