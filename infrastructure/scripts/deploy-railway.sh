#!/bin/bash
# Deploy to Railway
# Requires: railway CLI installed and logged in

set -e

echo "Deploying to Railway..."

# Run migrations on Supabase before deploying
echo "Running DB migrations..."
pnpm db:migrate

# Deploy each service
echo "Deploying API..."
railway up --service isp-api --detach

echo "Deploying Web..."
railway up --service isp-web --detach

echo "Deploying Portal..."
railway up --service isp-portal --detach

echo "✅ Deployment initiated. Check Railway dashboard for status."
echo "railway logs --service isp-api"
