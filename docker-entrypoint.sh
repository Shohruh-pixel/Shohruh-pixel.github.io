#!/bin/sh
set -e

cd /app/backend

# The SQLite file lives on the mounted volume, so deploys replace the code without touching the
# accumulated rate history. DATABASE_URL is set by the host config (fly.toml) to a path there.
echo "[boot] applying migrations"
npx prisma migrate deploy

# A brand-new volume has no banks, and the scraper matches NBT's rows against existing bank
# records — with an empty table it would have nothing to attach rates to and silently do nothing.
# Seeding only when empty keeps real accumulated data safe on every later boot.
BANK_COUNT=$(node -e "require('./src/config/prisma').bank.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log(0); process.exit(0); })")

if [ "$BANK_COUNT" = "0" ]; then
  echo "[boot] empty database, seeding bank list"
  node prisma/seed.js
else
  echo "[boot] $BANK_COUNT banks already present, skipping seed"
fi

echo "[boot] starting api"
exec node src/index.js
