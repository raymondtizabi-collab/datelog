#!/usr/bin/env bash
# Verify Community Oracle RPCs after community.sql is applied:  bash supabase/verify_community.sh
# Creates ONE throwaway post (nick "VerifyBot"), votes, resolves, then deletes it.
set -u
URL=https://gjtpiszuadcvsxblmogt.supabase.co
KEY=sb_publishable_YaqJwehqSogqINz5Q1vFHA_4ZA-2uKM
H=(-H "apikey: $KEY" -H "Content-Type: application/json")
hex(){ head -c"$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
PID=$(hex 16); VID=$(hex 16); pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "PASS  $1 ($2)"; pass=$((pass+1)); else echo "FAIL  $1 (got $2, want $3) ${4:-}"; fail=$((fail+1)); fi; }
rpc(){ curl -s -o /tmp/sbc.out -w '%{http_code}' -X POST "$URL/rest/v1/rpc/$1" "${H[@]}" -d "$2"; }
j(){ python3 -c "import json,sys;d=json.load(open('/tmp/sbc.out'));print($1)" 2>/dev/null; }

c=$(rpc post_community "{\"p_nick\":\"VerifyBot\",\"p_type\":\"coffee\",\"p_area\":\"West LA\",\"p_day\":\"Friday\",\"p_met\":\"Hinge\",\"p_excite\":4,\"p_days_until\":2,\"p_poster\":\"$PID\"}")
chk "post_community" "$c" 200 "$(cat /tmp/sbc.out)"; POST=$(j "d['id']"); TOK=$(j "d['token']")
c=$(rpc post_community "{\"p_nick\":\"x\",\"p_type\":\"brunch\",\"p_area\":\"West LA\",\"p_day\":\"Friday\",\"p_met\":\"Hinge\",\"p_excite\":4,\"p_days_until\":2,\"p_poster\":\"$PID\"}")
chk "bad enum rejected" "$([ "$c" -ge 400 ] && echo yes)" yes "$c"
c=$(rpc post_community "{\"p_nick\":\"call 3105551234\",\"p_type\":\"coffee\",\"p_area\":\"West LA\",\"p_day\":\"Friday\",\"p_met\":\"Hinge\",\"p_excite\":4,\"p_days_until\":2,\"p_poster\":\"$PID\"}")
chk "contact-info nick rejected" "$([ "$c" -ge 400 ] && echo yes)" yes "$c"
c=$(rpc vote_community "{\"p_post\":\"$POST\",\"p_voter\":\"$VID\",\"p_pick\":\"yes\"}"); chk "vote" "$c" 200 "$(cat /tmp/sbc.out)"
rpc vote_community "{\"p_post\":\"$POST\",\"p_voter\":\"$VID\",\"p_pick\":\"no\"}" >/dev/null; chk "one vote per voter" "$(j "d['yes'],d['no']")" "(1, 0)"
c=$(rpc list_community "{\"p_voter\":\"$VID\"}"); chk "list_community" "$c" 200
chk "list shows post + my pick" "$(j "[(p['yes_votes'],p['my_pick']) for p in d if p['id']=='$POST']")" "[(1, 'yes')]"
grep -q -i 'token\|poster' /tmp/sbc.out && chk "no secrets in list" leaked none || chk "no secrets in list" none none
c=$(rpc resolve_community "{\"p_post\":\"$POST\",\"p_token\":\"wrong\",\"p_outcome\":\"yes\"}"); chk "resolve with wrong token refused" "$(cat /tmp/sbc.out)" false
c=$(rpc resolve_community "{\"p_post\":\"$POST\",\"p_token\":\"$TOK\",\"p_outcome\":\"yes\"}"); chk "resolve" "$(cat /tmp/sbc.out)" true
c=$(rpc vote_community "{\"p_post\":\"$POST\",\"p_voter\":\"$(hex 16)\",\"p_pick\":\"no\"}"); chk "no votes after resolve" "$([ "$c" -ge 400 ] && echo yes)" yes "$c"
c=$(curl -s -o /tmp/sbc.out -w '%{http_code}' "$URL/rest/v1/community_posts?select=*" "${H[@]}")
if [ "$c" = 401 ] || [ "$c" = 403 ] || [ "$c" = 404 ] || [ "$(cat /tmp/sbc.out)" = "[]" ]; then chk "direct table read blocked" yes yes; else chk "direct table read blocked" "$c" "401/403/[]"; fi
c=$(curl -s -o /tmp/sbc.out -w '%{http_code}' -X POST "$URL/rest/v1/call_guesses" "${H[@]}" -H "Prefer: return=minimal" -d "{\"call_id\":\"$(hex 16)\",\"friend_name\":\"VerifyBot\",\"guess\":{\"p2\":\"yes\"}}")
chk "quick friend guess (2nd-date only) accepted" "$c" 201 "$(cat /tmp/sbc.out)"
c=$(rpc delete_community "{\"p_post\":\"$POST\",\"p_token\":\"$TOK\"}"); chk "delete" "$(cat /tmp/sbc.out)" true
echo "passed $pass, failed $fail"; [ "$fail" = 0 ]
