#!/usr/bin/env bash
# After details.sql is applied:  bash supabase/verify_details.sh
# Read-only except for two post_community calls that MUST be rejected (invalid details) — nothing is written.
set -u
URL=https://gjtpiszuadcvsxblmogt.supabase.co; KEY=sb_publishable_YaqJwehqSogqINz5Q1vFHA_4ZA-2uKM
H=(-H "apikey: $KEY" -H "Content-Type: application/json")
c=$(curl -s -o /tmp/sbd.out -w '%{http_code}' -X POST "$URL/rest/v1/rpc/list_community" "${H[@]}" -d '{}')
[ "$c" = 200 ] || { echo "FAIL list_community HTTP $c $(cat /tmp/sbd.out)"; exit 1; }
F=0
python3 - <<'PY' || F=1
import json,sys
d=json.load(open('/tmp/sbd.out'));ex=[p for p in d if p.get('is_example')];F=0
def chk(c,m):
    global F;print(('PASS  ' if c else 'FAIL  ')+m);F+=0 if c else 1
chk(bool(d) and 'details' in d[0],'list_community returns details (is details.sql applied?)')
if F: sys.exit(1)
chk(len(ex)==10 and all(isinstance(p.get('details'),dict) for p in ex),'all 10 examples have details')
chk(all(set(p['details'])>={'you','them','ctx','like','flag'} for p in ex),'examples have You, Them, date context and both one-liners')
chk(all(len(p['details']['like'])<=80 and len(p['details']['flag'])<=80 for p in ex),'one-liners <= 80 chars')
chk(all(len(p['details']['you'].get('vibe',[]))<=3 and len(p['details']['them'].get('vibe',[]))<=3 for p in ex),'max 3 vibe tags')
chk({p['gender'] for p in ex}=={'Woman','Man'} and sum(p['gender']==p['seeking'] for p in ex)==2,'gender mix unchanged (no nonbinary, 2 same-sex)')
for p in ex:x=p['details'];print(f"   Example · {p['nick']}: me {x['you'].get('job')}/{x['you'].get('want')} · them {x['them'].get('job')}/{x['them'].get('want')} · {x['ctx'].get('num')} date · 💚 {x['like']}")
sys.exit(1 if F else 0)
PY
for bad in '{"them":{"name":"Bob"}}' '{"like":"text me 555 1234"}'; do
  c=$(curl -s -o /tmp/sbd2.out -w '%{http_code}' -X POST "$URL/rest/v1/rpc/post_community" "${H[@]}" \
    -d "{\"p_nick\":\"Verify\",\"p_type\":\"coffee\",\"p_area\":\"West LA\",\"p_day\":\"tomorrow\",\"p_met\":\"Hinge\",\"p_excite\":3,\"p_days_until\":1,\"p_poster\":\"$(openssl rand -hex 16)\",\"p_details\":$bad}")
  if [ "$c" != 200 ] && grep -q 'bad details' /tmp/sbd2.out; then echo "PASS  rejects $bad"; else echo "FAIL  $bad -> HTTP $c $(cat /tmp/sbd2.out)"; F=1; fi
done
[ $F = 0 ] && echo "ALL PASS" || { echo "SOME CHECKS FAILED"; exit 1; }
