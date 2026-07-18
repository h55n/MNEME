#!/bin/sh
# MNEME API — Docker Entrypoint
# Runs database migrations before starting the server.
set -e

echo "[entrypoint] Running database migrations..."
node apps/api/dist/migrate.js

echo "[entrypoint] Migrations complete. Starting MNEME API..."
exec "$@"
