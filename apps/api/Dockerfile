# ─────────────────────────────────────────────────────────────────────────────
# MNEME API — Production Dockerfile
# Multi-stage: deps → builder → runner
# Runs DB migrations via entrypoint before starting the server.
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: base OS layer
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Stage 2: install all dependencies
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --ignore-scripts

# Stage 3: build
FROM deps AS builder
COPY tsconfig.base.json ./
# Build shared package first (API depends on it)
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Build API (includes migrate.ts → dist/migrate.js)
COPY apps/api ./apps/api
RUN npm run build --workspace=apps/api

# Stage 4: lean production image
FROM node:22-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 mneme \
 && adduser  --system --uid 1001 mneme

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder --chown=mneme:mneme /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder --chown=mneme:mneme /app/packages/shared/package.json  ./packages/shared/
COPY --from=builder --chown=mneme:mneme /app/apps/api/dist                 ./apps/api/dist
COPY --from=builder --chown=mneme:mneme /app/apps/api/package.json         ./apps/api/
COPY --from=builder --chown=mneme:mneme /app/node_modules                  ./node_modules
COPY --from=builder --chown=mneme:mneme /app/package.json                  ./
# SQL migration files (read by dist/migrate.js at startup)
COPY --from=builder --chown=mneme:mneme /app/apps/api/src/db/migrations    ./apps/api/dist/db/migrations/

# Entrypoint: run migrations then start server
COPY --chown=mneme:mneme apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER mneme

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/index.js"]
