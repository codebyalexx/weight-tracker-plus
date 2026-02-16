# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM node:20-alpine AS deps

# Native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

# ==========================================
# Stage 2: Build the application
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# Stage 3: Production runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone build (includes server.js + node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static assets (not included in standalone by default)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /app/data

# Point the database at the persistent volume directory
ENV DB_PATH=/app/data/weight-tracker.db

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
