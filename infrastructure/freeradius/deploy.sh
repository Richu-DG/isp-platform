#!/bin/bash
# Deploy FreeRADIUS on a VPS.
# Run this script on the VPS (Ubuntu 20.04/22.04 recommended).
# The VPS needs ports 1812/udp and 1813/udp open in its firewall.
#
# Usage: ./deploy.sh

set -euo pipefail

echo "=== ISP Platform — FreeRADIUS Setup ==="
echo ""

# 1. Check Docker
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
    echo "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
fi

# 2. Supabase credentials
echo "Enter your Supabase credentials (from Supabase dashboard → Settings → Database):"
read -rp "  Supabase password: " -s DB_PASS
echo ""

# 3. Patch the SQL config with the real password
sed -i "s|SUPABASE_PASSWORD_HERE|${DB_PASS}|g" mods-available/sql
echo "✓ Database credentials configured"

# 4. Apply RADIUS schema to Supabase
echo ""
echo "Applying FreeRADIUS schema to Supabase..."
if command -v psql &>/dev/null; then
    PGPASSWORD="$DB_PASS" psql \
        "postgresql://postgres.ducvmtxpymnojdhokfil:${DB_PASS}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" \
        -f schema.sql && echo "✓ Schema applied"
else
    echo "  psql not found — apply schema.sql manually in Supabase SQL Editor"
fi

# 5. Open firewall ports (UFW)
if command -v ufw &>/dev/null; then
    ufw allow 1812/udp comment "RADIUS Auth"
    ufw allow 1813/udp comment "RADIUS Accounting"
    echo "✓ Firewall rules added (1812/udp, 1813/udp)"
fi

# 6. Start FreeRADIUS
docker compose up -d
echo ""
echo "✓ FreeRADIUS is running"
echo ""
echo "================================================================"
echo " VPS public IP: $(curl -s ifconfig.me 2>/dev/null || echo '<your-vps-ip>')"
echo "================================================================"
echo ""
echo "Next — configure each MikroTik router to send accounting to this server:"
echo ""
echo "  /radius add service=ppp address=<VPS_IP> secret=<from clients.conf> authentication-port=1812 accounting-port=1813"
echo "  /ppp aaa set use-radius=yes accounting=yes"
echo ""
echo "Verify it's working:"
echo "  docker compose logs -f freeradius"
