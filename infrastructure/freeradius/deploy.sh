#!/bin/bash
# Run this on the server that will host FreeRADIUS (your on-site Linux box or VPS).
# Requirements: Docker, Docker Compose, access to Supabase from this server.

set -euo pipefail

echo "=== ISP Platform — FreeRADIUS Setup ==="

# 1. Prompt for Supabase connection details
read -rp "Supabase host (e.g. aws-1-eu-central-1.pooler.supabase.com): " DB_HOST
read -rp "Supabase project ref (e.g. ducvmtxpymnojdhokfil): " DB_REF
read -rsp "Supabase password: " DB_PASS
echo

# 2. Patch sql.conf with real credentials
sed -i "s|aws-0-eu-central-1.pooler.supabase.com|${DB_HOST}|g" mods-enabled/sql
sed -i "s|PROJECT_REF|${DB_REF}|g" mods-enabled/sql
sed -i "s|YOUR_SUPABASE_PASSWORD|${DB_PASS}|g" mods-enabled/sql

# 3. Run the RADIUS schema against Supabase
echo "Applying FreeRADIUS schema to Supabase..."
PGPASSWORD="$DB_PASS" psql \
  "postgresql://postgres.${DB_REF}:${DB_PASS}@${DB_HOST}:5432/postgres" \
  -f schema.sql
echo "Schema applied."

# 4. Start FreeRADIUS
docker compose up -d
echo "FreeRADIUS started. Check logs: docker compose logs -f freeradius"
echo ""
echo "Next: configure your MikroTik router to use this server's IP as RADIUS server:"
echo "  /radius add service=ppp address=<THIS_SERVER_IP> secret=<from clients.conf>"
echo "  /ppp aaa set use-radius=yes"
