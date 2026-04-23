# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM node:20-alpine AS deps

# Native build tools needed for better-sqlite3 (used during data import only)
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN npm ci

# ==========================================
# Stage 2: Build the application
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate

RUN npm run build

# ==========================================
# Stage 3: Production runner
# ==========================================
FROM node:20-alpine AS runner

# openssl is required by the Prisma query engine binary
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: generated client + query engine binary + migration files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# pg driver — used by scripts/migrate.mjs at boot (no Prisma CLI needed)
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string

# Migration runner script
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs

# Dev deps kept for the one-shot SQLite import (run manually inside the container)
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
COPY --from=builder /app/scripts/import-sqlite.ts ./scripts/import-sqlite.ts
COPY --from=builder /app/src/lib/sqliteImporter.ts ./src/lib/sqliteImporter.ts

# Entrypoint
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
