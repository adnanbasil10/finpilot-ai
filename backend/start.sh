#!/bin/bash
# Backend entrypoint – runs migrations then starts the server.
set -e

echo "⏳ Waiting for database..."
# Wait until PostgreSQL is actually accepting connections
for i in $(seq 1 30); do
    python -c "
import sqlalchemy, os
engine = sqlalchemy.create_engine(os.environ['DATABASE_URL'])
engine.connect().close()
" 2>/dev/null && break
    echo "  Attempt $i/30 – DB not ready, retrying in 2s..."
    sleep 2
done

echo "🔄 Running database migrations..."
alembic upgrade head

echo "🚀 Starting FinPilot AI backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
