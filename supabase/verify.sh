#!/usr/bin/env bash
# Verify the Datelog Supabase setup with the PUBLIC publishable key. Run after schema.sql is applied:
#   bash supabase/verify.sh
# Writes ONE throwaway guess under a random call id (harmless, unlinkable). Writes nothing to pooled_dates.
set -u
URL=https://gjtpiszuadcvsxblmogt.supabase.co
KEY=sb_publishable_YaqJwehqSogqINz5Q1vFHA_4ZA-2uKM
CID=$(head -c16 /dev/urandom | od -An -tx1 | tr -d ' \n')
H=(-H "apikey: $KEY" -H "Content-Type: application/json")
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "PASS  $1 ($2)"; pass=$((pass+1)); else echo "FAIL  $1 (got $2, want $3) $4"; fail=$((fail+1)); fi; }
req(){ curl -s -o /tmp/sbv.out -w '%{http_code}' "$@"; }

c=$(req -X POST "$URL/rest/v1/call_guesses" "${H[@]}" -H "Prefer: return=minimal" \
  -d "{\"call_id\":\"$CID\",\"friend_name\":\"VerifyBot\",\"guess\":{\"p2\":\"yes\",\"pw\":4,\"pm\":\"both\"}}")
chk "insert guess" "$c" 201 "$(cat /tmp/sbv.out)"

c=$(req -X POST "$URL/rest/v1/call_guesses" "${H[@]}" -H "Prefer: return=minimal" \
  -d "{\"call_id\":\"$CID\",\"friend_name\":\"VerifyBot\",\"guess\":{\"p2\":\"yes\",\"pw\":9,\"pm\":\"both\"}}")
chk "bad guess rejected" "$c" 400 "$(cat /tmp/sbv.out)"

c=$(req -X POST "$URL/rest/v1/rpc/get_guesses" "${H[@]}" -d "{\"p_call_id\":\"$CID\"}")
body=$(cat /tmp/sbv.out)
chk "rpc get_guesses" "$c" 200 "$body"
case "$body" in *VerifyBot*) chk "rpc returns the guess" yes yes;; *) chk "rpc returns the guess" no yes "$body";; esac

c=$(req "$URL/rest/v1/call_guesses?select=*&limit=1" "${H[@]}")
body=$(cat /tmp/sbv.out)
if [ "$c" = 401 ] || [ "$c" = 403 ] || [ "$body" = "[]" ]; then chk "direct list of guesses blocked" yes yes; else chk "direct list of guesses blocked" "$c $body" "401/403/[]"; fi

c=$(req "$URL/rest/v1/pooled_dates?select=*&limit=1" "${H[@]}")
body=$(cat /tmp/sbv.out)
if [ "$c" = 401 ] || [ "$c" = 403 ] || [ "$body" = "[]" ]; then chk "direct read of pool blocked" yes yes; else chk "direct read of pool blocked" "$c $body" "401/403/[]"; fi

# invalid pooled row (exact date + free text) must be rejected by the check constraints -> proves insert path + checks without writing
c=$(req -X POST "$URL/rest/v1/pooled_dates" "${H[@]}" -H "Prefer: return=minimal" \
  -d '{"row_id":"00000000-0000-4000-8000-000000000000","month":"2026-10-05","date_num":1,"date_type":"dinner","met":"Hinge","channel":"Online","why":["my secret text"]}')
chk "bad pooled row rejected" "$c" 400 "$(cat /tmp/sbv.out)"

c=$(req -X POST "$URL/rest/v1/rpc/pooled_summary" "${H[@]}" -d '{}')
chk "rpc pooled_summary" "$c" 200 "$(cat /tmp/sbv.out)"; echo "      summary: $(cat /tmp/sbv.out)"

echo; echo "$pass passed, $fail failed"; [ $fail -eq 0 ]
