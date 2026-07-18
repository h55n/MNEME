#!/usr/bin/env bash
# ── MNEME PostgreSQL Backup Script ────────────────────────────────────────────
# Usage: ./scripts/backup-db.sh [optional-output-dir]
# Env vars: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
# Stores compressed backup to BACKUP_DIR (default: ./backups)

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mneme_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-mneme}"
POSTGRES_USER="${POSTGRES_USER:-mneme}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[mneme-backup] Starting backup at ${TIMESTAMP}"
echo "[mneme-backup] Database: ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
echo "[mneme-backup] Output: ${BACKUP_FILE}"

# Run pg_dump piped through gzip
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --verbose \
  2>/dev/null \
  | gzip -9 > "${BACKUP_FILE}"

FILE_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[mneme-backup] Backup complete: ${BACKUP_FILE} (${FILE_SIZE})"

# Remove backups older than RETENTION_DAYS
echo "[mneme-backup] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "mneme_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(ls "${BACKUP_DIR}" | wc -l)
echo "[mneme-backup] Remaining backups: ${REMAINING}"

echo "[mneme-backup] Done."
