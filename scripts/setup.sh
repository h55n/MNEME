#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MNEME — Local Development Bootstrap
#
# Sets up a complete local development environment from scratch.
# Requires: Docker, Node.js 22+, npm 10+
#
# Usage: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()    { echo -e "${GREEN}[setup]${NC} $1"; }
warn()   { echo -e "${YELLOW}[setup]${NC} $1"; }
error()  { echo -e "${RED}[setup]${NC} $1"; exit 1; }

# ── Checks ────────────────────────────────────────────────────────────────────

log "Checking prerequisites..."

command -v docker  >/dev/null 2>&1 || error "Docker is not installed."
command -v node    >/dev/null 2>&1 || error "Node.js is not installed. Required: >=22"
command -v npm     >/dev/null 2>&1 || error "npm is not installed. Required: >=10"

NODE_VER=$(node -e "process.stdout.write(process.version.replace('v',''))")
NPM_VER=$(npm --version)
log "Node.js ${NODE_VER}, npm ${NPM_VER}"

# ── .env ─────────────────────────────────────────────────────────────────────

if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  warn "⚠  .env created — fill in OPENAI_API_KEY and MONAD_PRIVATE_KEY before starting."
else
  log ".env already exists — skipping copy."
fi

# ── npm install ───────────────────────────────────────────────────────────────

log "Installing npm dependencies..."
npm install

# ── Build shared package ──────────────────────────────────────────────────────

log "Building shared package..."
npm run build --workspace=packages/shared

# ── Spin up infrastructure ────────────────────────────────────────────────────

log "Starting Docker infrastructure (Postgres, Redis, Neo4j)..."
docker compose up -d postgres redis neo4j

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
until docker exec mneme-postgres pg_isready -U mneme >/dev/null 2>&1; do
  sleep 1
done
log "PostgreSQL is ready ✓"

# ── Run migrations ────────────────────────────────────────────────────────────

log "Running database migrations..."
npm run db:migrate:run

log ""
log "────────────────────────────────────────────────────────────────────"
log "✅  MNEME local environment is ready!"
log ""
log "  Start the API:        npm run dev --workspace=apps/api"
log "  Start the web app:    npm run dev --workspace=apps/web"
log "  Start all services:   docker compose up"
log "  Run tests:            npm test --workspace=apps/api"
log "  Run migrations:       npm run db:migrate:run"
log "────────────────────────────────────────────────────────────────────"
log ""
