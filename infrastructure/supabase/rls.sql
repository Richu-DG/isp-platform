-- Row-Level Security policies for ISP Platform
-- Run in Supabase SQL editor (Settings → SQL Editor)
-- These act as a safety net on top of application-layer tenantId filtering.
--
-- The API sets a session variable before each query:
--   SET LOCAL app.tenant_id = '<tenantId>';
-- Super-admin queries set it to 'superadmin' to bypass all filters.

-- ─── Helper function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$ LANGUAGE sql STABLE;

-- ─── Enable RLS on all tenant-scoped tables ───────────────────────────────────
ALTER TABLE subscribers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_metrics ENABLE ROW LEVEL SECURITY;

-- ─── Subscribers ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS subscribers_tenant_isolation ON subscribers;
CREATE POLICY subscribers_tenant_isolation ON subscribers
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Packages ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS packages_tenant_isolation ON packages;
CREATE POLICY packages_tenant_isolation ON packages
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Routers ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS routers_tenant_isolation ON routers;
CREATE POLICY routers_tenant_isolation ON routers
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Sessions ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  USING (
    current_tenant_id() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM subscribers s
      WHERE s.id = sessions."subscriberId"
        AND s."tenantId" = current_tenant_id()
    )
  );

-- ─── Devices ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS devices_tenant_isolation ON devices;
CREATE POLICY devices_tenant_isolation ON devices
  USING (
    current_tenant_id() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM subscribers s
      WHERE s.id = devices."subscriberId"
        AND s."tenantId" = current_tenant_id()
    )
  );

-- ─── Invoices ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Payments ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
CREATE POLICY payments_tenant_isolation ON payments
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Vouchers ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS vouchers_tenant_isolation ON vouchers;
CREATE POLICY vouchers_tenant_isolation ON vouchers
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Tickets ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tickets_tenant_isolation ON tickets;
CREATE POLICY tickets_tenant_isolation ON tickets
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Notifications ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Users (admin accounts) ───────────────────────────────────────────────────
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (
    current_tenant_id() = 'superadmin'
    OR "tenantId" = current_tenant_id()
  );

-- ─── Usage Records ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS usage_records_tenant_isolation ON usage_records;
CREATE POLICY usage_records_tenant_isolation ON usage_records
  USING (
    current_tenant_id() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM subscribers s
      WHERE s.id = usage_records."subscriberId"
        AND s."tenantId" = current_tenant_id()
    )
  );

-- ─── Network Metrics (router-scoped, not tenant-scoped directly) ──────────────
DROP POLICY IF EXISTS network_metrics_tenant_isolation ON network_metrics;
CREATE POLICY network_metrics_tenant_isolation ON network_metrics
  USING (
    current_tenant_id() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM routers r
      WHERE r.id = network_metrics."routerId"
        AND r."tenantId" = current_tenant_id()
    )
  );
