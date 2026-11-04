#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/backend
uv run --project /app alembic upgrade head

echo "Starting API server..."
cd /app
exec "$@"