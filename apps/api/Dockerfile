# ─────────────────────────────────────────────────────────────────────────────
# MNEME API — Production Dockerfile
# Multi-stage: deps → builder → runner
# Runs DB migrations via entrypoint before starting the server.
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: base OS layer
# Debian (glibc), not Alpine: the local embedder's onnxruntime binaries need glibc.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# Stage 2: install all dependencies
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/mcp/package.json ./apps/mcp/
RUN npm ci --ignore-scripts

# Stage 3: build
FROM deps AS builder
COPY tsconfig.base.json ./
# Build shared package first (API depends on it)
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

COPY apps/mcp ./apps/mcp
RUN npm run build --workspace=apps/mcp

# Build API (includes migrate.ts → dist/migrate.js)
COPY apps/api ./apps/api
RUN npm run build --workspace=apps/api

# Download the embedding model once, at build time, so containers start without network.
ENV MODEL_CACHE_DIR=/app/models
RUN node -e "import('@huggingface/transformers').then(async m=>{m.env.cacheDir=process.env.MODEL_CACHE_DIR;await m.pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{dtype:'fp32'});console.log('model cached')})"

# Remove build/test tools before copying runtime dependencies.
RUN npm prune --omit=dev --ignore-scripts --workspace=packages/shared --workspace=apps/api --workspace=apps/mcp --include-workspace-root

# Stage 4: lean production image
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Security: run as non-root user
RUN groupadd --system --gid 1001 mneme \
 && useradd  --system --uid 1001 --gid mneme mneme

ENV NODE_ENV=production
ENV MODEL_CACHE_DIR=/app/models
COPY --from=builder --chown=mneme:mneme /app/models ./models

# Copy only what's needed to run
COPY --from=builder --chown=mneme:mneme /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder --chown=mneme:mneme /app/packages/shared/package.json  ./packages/shared/
COPY --from=builder --chown=mneme:mneme /app/apps/api/dist                 ./apps/api/dist
COPY --from=builder --chown=mneme:mneme /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=mneme:mneme /app/apps/api/package.json         ./apps/api/
COPY --from=builder --chown=mneme:mneme /app/node_modules                  ./node_modules
COPY --from=builder --chown=mneme:mneme /app/package.json                  ./
COPY --from=builder --chown=mneme:mneme /app/apps/mcp/dist ./apps/mcp/dist
COPY --from=builder --chown=mneme:mneme /app/apps/mcp/package.json ./apps/mcp/
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
