#!/usr/bin/env bash
# Vercel build: generate client -> apply pending migrations -> (optional) demo seed -> Next build.
# SEED_DEMO=1 loads the Christmas demo data + admin account ONLY when the catalogue is empty (the seed refuses otherwise).
# Remove SEED_DEMO (or set it to 0) after the first deployment; use SEED_ADMIN_ONLY=1 for a real launch.
set -euo pipefail
npx prisma generate
npx prisma migrate deploy
if [ "${SEED_DEMO:-0}" = "1" ] || [ "${SEED_ADMIN_ONLY:-0}" = "1" ]; then
  npx tsx prisma/seed.ts
fi
npx next build
