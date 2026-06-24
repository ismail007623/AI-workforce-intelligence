#!/bin/sh
set -e

echo "Running database migrations..."
uv run --project /app alembic upgrade head

echo "Starting API server..."
exec "$@"
