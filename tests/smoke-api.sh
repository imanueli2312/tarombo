#!/usr/bin/env bash
###############################################################################
# Tarombo — Smoke test API (audit T-01)
#
# Menjalankan server standalone hasil `bun run build` pada port sementara
# dengan database & secret uji, lalu memverifikasi perilaku inti endpoint:
#   401 tanpa auth / 400 JSON malformed / 413 payload besar / 429 rate limit /
#   403 lintas-origin / 200 happy path / proteksi admin.
#
# Prasyarat: `bun run build` sudah dijalankan (output .next/standalone).
# Pemakaian: bash tests/smoke-api.sh
###############################################################################
set -euo pipefail

PORT="${SMOKE_PORT:-3178}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'kill ${SERVER_PID:-0} 2>/dev/null || true; rm -rf "$TMP"' EXIT

export DATABASE_PATH="$TMP/smoke.db"
export JWT_SECRET="smoke-test-secret-0123456789abcdef0123456789abcdef"
export SEED_ADMIN_PASSWORD="admin123test"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production
export PORT

PASS=0
FAIL=0

check() {
  local name="$1" expect="$2" got="$3" extra="${4:-}"
  if [ "$got" = "$expect" ]; then
    PASS=$((PASS + 1))
    echo "  PASS  $name (${got})"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL  $name — harap ${expect}, dapat ${got} ${extra}"
  fi
}

json_field() { # body, field → nilai string sederhana
  printf '%s' "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null || true
}

echo "[smoke] menunggu server standalone di port $PORT..."
node "$ROOT/.next/standalone/server.js" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 60); do
  if curl -sf -m 2 "http://localhost:$PORT/api/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[smoke] server mati — log:"; tail -20 "$TMP/server.log"; exit 1
  fi
  sleep 0.5
done

BASE="http://localhost:$PORT"
JAR="$TMP/cookies.txt"

echo "[smoke] health & autentikasi"
H=$(curl -s -m 5 "$BASE/api/health")
check "GET /api/health status ok" "ok" "$(json_field "$H" status)"
check "GET /api/health tanpa detail error DB" "" "$(json_field "$H" error)"

check "GET /api/tree tanpa auth → 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$BASE/api/tree")"
check "GET /api/persons tanpa auth → 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$BASE/api/persons")"
check "GET /api/metrics tanpa auth → 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$BASE/api/metrics")"

echo "[smoke] guard body & CSRF"
check "POST /api/auth/login JSON malformed → 400" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' --data '{bukan-json')"
check "POST /api/auth/login body 2MB → 413" "413" \
  "$(python3 -c "print('{\"email\":\"x@x.com\",\"password\":\"' + 'a'*2100000 + '\"}')" | curl -s -o /dev/null -w '%{http_code}' -m 15 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' --data-binary @-)"
check "POST lintas-origin → 403" "403" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -H 'Origin: http://evil.example.com' --data '{"email":"x@x.com","password":"12345678"}')"

echo "[smoke] seed bootstrap + login"
S=$(curl -s -m 10 -X POST "$BASE/api/seed" -w '\n%{http_code}')
SC=$(echo "$S" | tail -1)
if [ "$SC" = "200" ] || [ "$SC" = "201" ]; then check "POST /api/seed (bootstrap idempoten)" "200" "200"; else check "POST /api/seed (bootstrap idempoten)" "200" "$SC"; fi

L=$(curl -s -m 10 -c "$JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  --data "{\"email\":\"admin@tarombo.local\",\"password\":\"$SEED_ADMIN_PASSWORD\"}")
check "POST /api/auth/login kredensial benar → 200" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 10 -c "$JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"admin@tarombo.local\",\"password\":\"$SEED_ADMIN_PASSWORD\"}")"
ROLE=$(json_field "$L" 'user' | python3 -c "import json,sys; print(json.load(sys.stdin).get('role',''))" 2>/dev/null || echo "?")
echo "  info  login sebagai role: ${ROLE}"

echo "[smoke] akses terautentikasi"
T=$(curl -s -m 5 -b "$JAR" "$BASE/api/tree")
check "GET /api/tree dengan cookie → 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 10 -b "$JAR" "$BASE/api/tree")"
N=$(printf '%s' "$T" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
echo "  info  node pohon dari seed: ${N}"

echo "[smoke] validasi tulis"
check "POST /api/persons tanpa field wajib → 400" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR" -X POST "$BASE/api/persons" -H 'Content-Type: application/json' --data '{}')"
check "POST /api/persons jenis_kelamin invalid → 400" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR" -X POST "$BASE/api/persons" -H 'Content-Type: application/json' --data '{"nama":"Uji","jenis_kelamin":"X"}')"
check "POST /api/oral-histories JSON malformed → 400" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR" -X POST "$BASE/api/oral-histories" -H 'Content-Type: application/json' --data 'xxx')"
PC=$(curl -s -m 5 -b "$JAR" -X POST "$BASE/api/persons" -H 'Content-Type: application/json' \
  --data '{"nama":"Penguji Smoke","jenis_kelamin":"L","keterangan":"dibuat oleh smoke test"}' -o /dev/null -w '%{http_code}')
check "POST /api/persons valid → 201" "201" "$PC"

echo "[smoke] revocasi sesi E2E (audit T-02)"
JAR2="$TMP/cookies2.txt"
UC=$(curl -s -m 5 -b "$JAR" -X POST "$BASE/api/rbac/users" -H 'Content-Type: application/json' \
  --data '{"email":"viewer-smoke@example.com","password":"viewer123pass","name":"Viewer Smoke","role":"viewer"}' \
  -o "$TMP/user.json" -w '%{http_code}')
check "POST /api/rbac/users buat viewer → 201" "201" "$UC"
USER_ID=$(json_field "$(cat "$TMP/user.json" 2>/dev/null || echo '{}')" id)

VL=$(curl -s -m 5 -c "$JAR2" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  --data '{"email":"viewer-smoke@example.com","password":"viewer123pass"}' -o /dev/null -w '%{http_code}')
check "login viewer → 200" "200" "$VL"
check "GET /api/tree viewer (sesi aktif) → 200" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR2" "$BASE/api/tree")"

# Admin mengubah role → token_version naik → token lama harus hangus SEKETIKA
RC=$(curl -s -m 5 -b "$JAR" -X PUT "$BASE/api/rbac/users/$USER_ID" -H 'Content-Type: application/json' \
  --data '{"role":"editor"}' -o /dev/null -w '%{http_code}')
check "PUT /api/rbac/users ganti role → 200" "200" "$RC"
check "GET /api/tree token LAMA setelah ubah role → 401 (revocasi)" "401" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR2" "$BASE/api/tree")"

echo "[smoke] adat eksogami (Panduan Adat Batak)"
mk_person() {
  curl -s -m 5 -b "$JAR" -X POST "$BASE/api/persons" -H 'Content-Type: application/json' --data "$1"
}
P1=$(mk_person '{"nama":"Semarga Satu","jenis_kelamin":"L","marga_asal":"Hariandja"}')
P2=$(mk_person '{"nama":"Semarga Dua","jenis_kelamin":"P","marga_asal":"Hariandja"}')
P1ID=$(json_field "$P1" id)
P2ID=$(json_field "$P2" id)
check "POST /api/partnerships semarga → 422 (adat)" "422" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -b "$JAR" -X POST "$BASE/api/partnerships" -H 'Content-Type: application/json' --data "{\"person1_id\":\"$P1ID\",\"person2_id\":\"$P2ID\"}")"

echo "[smoke] rate limit login (5 percobaan salah per IP+email)"
RL_EMAIL="korban-smoke@example.com"
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -m 5 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
    --data "{\"email\":\"$RL_EMAIL\",\"password\":\"salahpassword\"}" || true
done
check "percobaan login ke-6 → 429" "429" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$RL_EMAIL\",\"password\":\"salahpassword\"}")"

echo "[smoke] X-Request-ID terpasang (observabilitas)"
RID=$(curl -s -o /dev/null -D - -m 5 "$BASE/api/health" | grep -i '^x-request-id:' | tr -d '\r' | awk '{print $2}')
if [ -n "$RID" ]; then PASS=$((PASS+1)); echo "  PASS  header X-Request-ID ada ($RID)"; else FAIL=$((FAIL+1)); echo "  FAIL  header X-Request-ID absen"; fi

echo
echo "[smoke] selesai: $PASS lulus, $FAIL gagal"
if [ "$FAIL" -gt 0 ]; then
  echo "[smoke] log server terakhir:"; tail -30 "$TMP/server.log"
  exit 1
fi
