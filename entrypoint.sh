#!/bin/sh
set -e

# Apply pending Prisma migrations against the Postgres database pointed to by
# DATABASE_URL. Safe to run on every boot.
npx prisma migrate deploy --schema=./prisma/schema.prisma

exec node server.js
