# Railway Deployment Guide

Railway project: https://railway.com/project/21a991f1-0a1b-4a98-a0f7-ca898eb86409
GitHub repo:     https://github.com/Richu-DG/isp-platform

---

## Step 1 — Open Railway Dashboard

Go to: https://railway.com/project/21a991f1-0a1b-4a98-a0f7-ca898eb86409

---

## Step 2 — Add Redis

1. Click **+ New** → **Database** → **Add Redis**
2. Railway creates it automatically — copy the `REDIS_URL` from the Variables tab

---

## Step 3 — Create Service: isp-api

1. Click **+ New** → **GitHub Repo** → select `Richu-DG/isp-platform`
2. Railway will ask which service to configure:
   - **Name:** `isp-api`
   - **Root Directory:** `apps/api`
   - **Build Command:** `pnpm install && cd ../../packages/database && pnpm generate && cd ../../apps/api && pnpm build`
   - **Start Command:** `node dist/main`
   - **Watch Paths:** `apps/api/**`, `packages/**`

3. Add these **Environment Variables**:

```
DATABASE_URL=postgresql://postgres.ducvmtxpymnojdhokfil:AL9H%25wR4_3ar8Pk@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres.ducvmtxpymnojdhokfil:AL9H%25wR4_3ar8Pk@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=0db38c70ce29982e9d598ca400c9e404105c857fb4ed1675f500fdab5ba4437c
JWT_REFRESH_SECRET=1732b5e7f2c371253e4f0c42230d674b91b913203bfdb2fa65902fbf111a8a89
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3001
THROTTLE_TTL=60
THROTTLE_LIMIT=100
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<your-daraja-consumer-key>
MPESA_CONSUMER_SECRET=<your-daraja-consumer-secret>
MPESA_SHORTCODE=<your-paybill-or-till>
MPESA_PASSKEY=<your-daraja-passkey>
MPESA_STK_CALLBACK_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api/v1/payments/mpesa/stk-callback
MPESA_C2B_CONFIRMATION_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api/v1/payments/mpesa/c2b-confirmation
MPESA_C2B_VALIDATION_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api/v1/payments/mpesa/c2b-validation
AT_USERNAME=<your-at-username>
AT_API_KEY=<your-at-api-key>
CORS_ORIGINS=https://${{isp-web.RAILWAY_PUBLIC_DOMAIN}},https://${{isp-portal.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Step 4 — Create Service: isp-web

1. Click **+ New** → **GitHub Repo** → `Richu-DG/isp-platform`
   - **Name:** `isp-web`
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`

2. Environment Variables:
```
NEXT_PUBLIC_API_URL=https://${{isp-api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
NEXT_PUBLIC_PORTAL_URL=https://${{isp-portal.RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
PORT=3000
```

---

## Step 5 — Create Service: isp-portal

1. Click **+ New** → **GitHub Repo** → `Richu-DG/isp-platform`
   - **Name:** `isp-portal`
   - **Root Directory:** `apps/portal`
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`

2. Environment Variables:
```
NEXT_PUBLIC_API_URL=https://${{isp-api.RAILWAY_PUBLIC_DOMAIN}}/api/v1
NODE_ENV=production
PORT=3002
```

---

## Step 6 — Generate Public Domains

For each service → Settings → Networking → **Generate Domain**

- `isp-api`    → e.g. `isp-api-production.up.railway.app`
- `isp-web`    → e.g. `isp-web-production.up.railway.app`
- `isp-portal` → e.g. `isp-portal-production.up.railway.app`

Then update `CORS_ORIGINS` on isp-api with the real web + portal URLs.
And update `MPESA_STK_CALLBACK_URL` with the real isp-api URL.

---

## Step 7 — Verify

Health check: `https://your-isp-api.up.railway.app/api/v1/health`
Admin login:  `https://your-isp-web.up.railway.app/auth/login`
