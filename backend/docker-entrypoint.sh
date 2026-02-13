#!/bin/sh
set -e

echo "🚀 Starting Infinia Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
if [ -d "/app/migrations" ]; then
  npx node-pg-migrate up || echo "⚠️  Migrations failed or already applied"
else
  echo "ℹ️  No migrations directory found"
fi

# Start the application
echo "🎯 Starting application server..."
exec npx tsx src/index.ts
