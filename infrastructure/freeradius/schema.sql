-- FreeRADIUS PostgreSQL schema for Supabase
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT '',
    CONSTRAINT radcheck_username_attribute UNIQUE (username, attribute)
);
CREATE INDEX IF NOT EXISTS radcheck_username ON radcheck (username);

CREATE TABLE IF NOT EXISTS radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radreply_username ON radreply (username);

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupcheck_groupname ON radgroupcheck (groupname);

CREATE TABLE IF NOT EXISTS radgroupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radgroupreply_groupname ON radgroupreply (groupname);

CREATE TABLE IF NOT EXISTS radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS radusergroup_username ON radusergroup (username);

CREATE TABLE IF NOT EXISTS radacct (
    radacctid BIGSERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL DEFAULT '',
    acctuniqueid VARCHAR(32) NOT NULL DEFAULT '' UNIQUE,
    username VARCHAR(64) NOT NULL DEFAULT '',
    realm VARCHAR(64) DEFAULT '',
    nasipaddress VARCHAR(15) NOT NULL DEFAULT '',
    nasportid VARCHAR(32) DEFAULT NULL,
    nasporttype VARCHAR(32) DEFAULT NULL,
    acctstarttime TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    acctupdatetime TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    acctstoptime TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    acctinterval INTEGER DEFAULT NULL,
    acctsessiontime INTEGER DEFAULT NULL,
    acctauthentic VARCHAR(32) DEFAULT NULL,
    connectinfo_start VARCHAR(50) DEFAULT NULL,
    connectinfo_stop VARCHAR(50) DEFAULT NULL,
    acctinputoctets BIGINT DEFAULT NULL,
    acctoutputoctets BIGINT DEFAULT NULL,
    calledstationid VARCHAR(50) NOT NULL DEFAULT '',
    callingstationid VARCHAR(50) NOT NULL DEFAULT '',
    acctterminatecause VARCHAR(32) NOT NULL DEFAULT '',
    servicetype VARCHAR(32) DEFAULT NULL,
    framedprotocol VARCHAR(32) DEFAULT NULL,
    framedipaddress VARCHAR(15) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radacct_username ON radacct (username);
CREATE INDEX IF NOT EXISTS radacct_nasipaddress ON radacct (nasipaddress);
CREATE INDEX IF NOT EXISTS radacct_acctstarttime ON radacct (acctstarttime);
CREATE INDEX IF NOT EXISTS radacct_acctstoptime ON radacct (acctstoptime);
CREATE INDEX IF NOT EXISTS radacct_callingstationid ON radacct (callingstationid);

CREATE TABLE IF NOT EXISTS radpostauth (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    pass VARCHAR(64) NOT NULL DEFAULT '',
    reply VARCHAR(32) NOT NULL DEFAULT '',
    authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    class VARCHAR(64) DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS radpostauth_username ON radpostauth (username);

-- Sync subscribers table → radcheck on status change
-- Only syncs PPPoE subscribers; hotspot auth is handled by MikroTik hotspot directly
CREATE OR REPLACE FUNCTION sync_radius_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."connectionType" = 'PPPOE' THEN
        IF NEW.status = 'ACTIVE' THEN
            INSERT INTO radcheck (username, attribute, op, value)
            VALUES (NEW.username, 'Cleartext-Password', ':=', NEW.password)
            ON CONFLICT (username, attribute) DO UPDATE SET value = EXCLUDED.value;
        ELSE
            DELETE FROM radcheck WHERE username = NEW.username AND attribute = 'Cleartext-Password';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_radius_user ON subscribers;
CREATE TRIGGER trg_sync_radius_user
    AFTER INSERT OR UPDATE OF status, password, "connectionType"
    ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION sync_radius_user();
