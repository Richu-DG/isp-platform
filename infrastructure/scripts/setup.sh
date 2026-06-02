#!/bin/bash
# ISP Platform Setup Script
# Run this once on a fresh Ubuntu 22.04 server

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     ISP Platform Setup Script            ║"
echo "╚══════════════════════════════════════════╝"

# ─── Check Node.js ────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ─── Check pnpm ───────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@9
fi

# ─── Install dependencies ─────────────────────────────────
echo "Installing dependencies..."
pnpm install

# ─── Copy .env if needed ──────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "IMPORTANT: Edit .env with your Supabase + M-Pesa credentials!"
fi

# ─── Database setup ───────────────────────────────────────
echo "Running database migrations..."
pnpm db:generate
pnpm db:migrate

echo "Seeding database..."
pnpm db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start dev servers with: pnpm dev"
echo "API:    http://localhost:3001"
echo "Web:    http://localhost:3000"
echo "Portal: http://localhost:3002"
echo "Docs:   http://localhost:3001/api/docs"
echo ""
echo "Default login: admin@demoisp.co.ke / Admin@123!"
