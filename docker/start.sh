#!/usr/bin/env sh
set -eu

# Defaults that work well in containers.
: "${HOST:=0.0.0.0}"
: "${PORT:=4321}"

# Default to a persistent libSQL/SQLite URL.
# Tier-1 Docker uses Astro DB "remote" mode with a file: URL so the SSR server
# and CLI commands (db push/execute) all talk to the same database.
: "${ASTRO_DB_REMOTE_URL:=file:/data/wryteon.sqlite}"
: "${UPLOADS_DIR:=/data/uploads}"

export HOST PORT ASTRO_DB_REMOTE_URL UPLOADS_DIR

# Ensure writable paths exist (mount these as volumes for persistence).
mkdir -p /data "$UPLOADS_DIR"

echo "[wryteon] Using HOST=$HOST PORT=$PORT"
echo "[wryteon] Using ASTRO_DB_REMOTE_URL=$ASTRO_DB_REMOTE_URL"
echo "[wryteon] Using UPLOADS_DIR=$UPLOADS_DIR"

# Ensure schema exists (idempotent).
# NOTE: `astro db push` always targets the configured remote database.
./node_modules/.bin/astro db push

# Seed admin user if env vars are provided (seed script is safe to skip).
./node_modules/.bin/astro db execute db/seed.ts --remote || true

exec node dist/server/entry.mjs
