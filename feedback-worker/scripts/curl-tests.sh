#!/usr/bin/env bash
# Testet den Feedback-Worker mit curl.
#   BASE_URL=http://localhost:8787 KEY=testkey ./scripts/curl-tests.sh          (lokal)
#   BASE_URL=https://api.favopic.de KEY=<dein Key> ./scripts/curl-tests.sh      (produktiv)
# ACHTUNG: Die gültigen Anfragen werden wirklich als Mails zugestellt (insg. 5 Stück),
# und danach ist deine IP für 10 Minuten gedrosselt (das ist Teil des Tests).
set -u
BASE_URL="${BASE_URL:-http://localhost:8787}"
KEY="${KEY:?KEY setzen}"
URL="$BASE_URL/feedback"
fail=0

# check <Beschreibung> <erwarteter Status> <curl-Argumente ...>
check() {
  local desc="$1" want="$2"; shift 2
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [ "$got" = "$want" ]; then echo "OK   $desc -> $got"; else echo "FAIL $desc -> $got (erwartet $want)"; fail=1; fi
}
H_JSON=(-H 'Content-Type: application/json')
H_KEY=(-H "X-Favopic-Key: $KEY")

echo "== Fehlerfälle (verbrauchen kein Rate-Limit-Kontingent) =="
check "falsche Methode (GET)"        405 "$URL" "${H_KEY[@]}"
check "falscher Pfad"                404 -X POST "$BASE_URL/other" "${H_JSON[@]}" "${H_KEY[@]}" -d '{}'
check "Key fehlt"                    401 -X POST "$URL" "${H_JSON[@]}" -d '{"type":"feedback","message":"x"}'
check "Key falsch"                   401 -X POST "$URL" "${H_JSON[@]}" -H 'X-Favopic-Key: falsch' -d '{"type":"feedback","message":"x"}'
check "falscher Content-Type"        415 -X POST "$URL" -H 'Content-Type: text/plain' "${H_KEY[@]}" -d '{"type":"feedback","message":"x"}'
check "ungültiges JSON"              400 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d '{kaputt'
check "falscher type"                400 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d '{"type":"spam","message":"x"}'
check "leere Nachricht"              400 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d '{"type":"feedback","message":"   "}'
check "Nachricht zu lang (5001)"     400 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d "{\"type\":\"feedback\",\"message\":\"$(head -c 5001 /dev/zero | tr '\0' a)\"}"
head -c 250000 /dev/zero | tr '\0' a > /tmp/favopic-big.txt
check "Body zu groß (>200 KB)"       413 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" --data-binary @/tmp/favopic-big.txt
rm -f /tmp/favopic-big.txt

echo "== Gültige Anfragen =="
check "Feedback"                     200 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" \
  -d '{"type":"feedback","email":"tester@example.com","message":"Tolle App! <b>kein HTML</b>"}'
check "Bug-Report mit Logs"          200 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" \
  -d '{"type":"bugReport","email":"","message":"Crash beim Start","deviceInfo":"iPhone, iOS 26.1, v1.0 (12)","logs":"2026-11-06 10:00:00 start\n2026-11-06 10:00:01 crash"}'

if [ "${SKIP_RATELIMIT:-0}" != "1" ]; then
  echo "== Rate-Limit (5 pro 10 Minuten; 2 sind schon verbraucht -> 3 weitere ok, danach 429) =="
  for i in 1 2 3; do check "weitere gültige Anfrage $i" 200 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d '{"type":"feedback","message":"Ratelimit-Test"}'; done
  check "6. Anfrage -> gedrosselt"   429 -X POST "$URL" "${H_JSON[@]}" "${H_KEY[@]}" -d '{"type":"feedback","message":"Ratelimit-Test"}'
fi
exit $fail
