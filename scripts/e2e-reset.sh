#!/usr/bin/env bash
# Recreates the isolated e2e database, seeds it and (re)starts a dev server on :3100.
set -e
export DATABASE_URL=postgresql://postgres@localhost:5432/edlux_e2e DIRECT_URL=postgresql://postgres@localhost:5432/edlux_e2e
pkill -f "next dev -p 3100" 2>/dev/null || true
sleep 1
psql -h localhost -U postgres -qc "DROP DATABASE IF EXISTS edlux_e2e WITH (FORCE)" -c "CREATE DATABASE edlux_e2e"
npx prisma migrate deploy >/dev/null
npx prisma db seed >/dev/null
nohup npx next dev -p 3100 > /tmp/dev3100.log 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null localhost:3100/fr && break; sleep 1; done
curl -s -o /dev/null -w "e2e server ready: %{http_code}\n" localhost:3100/fr
