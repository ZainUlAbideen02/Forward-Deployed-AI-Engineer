-- ============================================================================
-- Phase 1: Enterprise Safe SQL Copilot - Database Initialization & Seed Data
-- Target Database: PostgreSQL 16
-- ============================================================================

-- Drop existing objects if resetting
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Schema Definitions
-- ----------------------------------------------------------------------------

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(50) NOT NULL CHECK (plan_tier IN ('free', 'starter', 'growth', 'enterprise')),
    monthly_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'billing_manager')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
    seats_purchased INTEGER NOT NULL DEFAULT 1,
    current_period_end TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ----------------------------------------------------------------------------
-- 2. Mock Enterprise Seed Data (20 rows each)
-- ----------------------------------------------------------------------------

-- Organizations (20 rows)
INSERT INTO organizations (name, plan_tier, monthly_spend, created_at) VALUES
('Acme Cloud Technologies', 'enterprise', 4850.00, '2023-01-15 08:30:00+00'),
('StripeLine Logistics', 'growth', 1250.00, '2023-02-10 11:20:00+00'),
('Apex Financial Partners', 'enterprise', 8900.00, '2023-02-28 09:15:00+00'),
('Nordic Health Analytics', 'enterprise', 6200.00, '2023-03-04 14:00:00+00'),
('Beacon Media Labs', 'starter', 350.00, '2023-04-12 16:45:00+00'),
('Quantum Cybernetics', 'enterprise', 12500.00, '2023-05-01 10:00:00+00'),
('Veloce Mobility Labs', 'growth', 1800.00, '2023-05-18 13:25:00+00'),
('Aura Digital Commerce', 'growth', 2400.00, '2023-06-02 09:40:00+00'),
('Summit Peak BioTech', 'enterprise', 7100.00, '2023-06-19 12:10:00+00'),
('Hyperion Energy Grid', 'enterprise', 9400.00, '2023-07-08 15:50:00+00'),
('TerraNova AgTech', 'starter', 420.00, '2023-07-22 08:15:00+00'),
('BlueWave Telecom', 'growth', 1950.00, '2023-08-11 11:30:00+00'),
('Kinetics Automation', 'starter', 290.00, '2023-08-29 17:05:00+00'),
('Lumina Security', 'enterprise', 5600.00, '2023-09-05 10:20:00+00'),
('Solstice Creative Studio', 'free', 0.00, '2023-09-17 14:40:00+00'),
('Vertex Robotics Systems', 'enterprise', 11200.00, '2023-10-01 09:00:00+00'),
('Echo Maritime Fleet', 'growth', 1650.00, '2023-10-15 13:10:00+00'),
('Silverline Retail Group', 'growth', 2100.00, '2023-11-03 16:35:00+00'),
('Crestview Legal Tech', 'starter', 490.00, '2023-11-20 11:50:00+00'),
('Zenith Space Systems', 'enterprise', 15400.00, '2023-12-01 08:00:00+00');

-- Users (25 rows)
INSERT INTO users (org_id, full_name, email, role, is_active, last_login) VALUES
(1, 'Alice Montgomery', 'alice.m@acmecloud.io', 'owner', true, '2024-03-01 10:14:00+00'),
(1, 'Marcus Vance', 'marcus.v@acmecloud.io', 'admin', true, '2024-03-01 11:22:00+00'),
(2, 'Sophia Delgado', 'sophia@stripeline.com', 'owner', true, '2024-02-28 16:45:00+00'),
(3, 'David Chen', 'dchen@apexfinancial.com', 'owner', true, '2024-03-01 08:10:00+00'),
(3, 'Rachel Zane', 'rzane@apexfinancial.com', 'billing_manager', true, '2024-02-25 14:30:00+00'),
(4, 'Lars Lindqvist', 'lars@nordichealth.se', 'owner', true, '2024-03-01 09:05:00+00'),
(5, 'Chloe Bennett', 'chloe@beaconmedia.co', 'admin', true, '2024-02-20 12:15:00+00'),
(6, 'Dr. Aris Thorne', 'athorne@quantumcyber.io', 'owner', true, '2024-03-01 15:55:00+00'),
(6, 'Elena Rostova', 'erostova@quantumcyber.io', 'member', true, '2024-02-27 17:40:00+00'),
(7, 'Carlos Mendez', 'cmendez@velocemobility.com', 'owner', true, '2024-02-26 13:20:00+00'),
(8, 'Hannah Abbott', 'hannah@auradigital.com', 'admin', true, '2024-03-01 14:10:00+00'),
(9, 'Robert Sterling', 'rsterling@summitbiotech.com', 'owner', true, '2024-02-28 10:00:00+00'),
(10, 'Karen O''Connor', 'koconnor@hyperiongrid.net', 'owner', true, '2024-03-01 07:45:00+00'),
(11, 'Mateo Rossi', 'mrossi@terranova.ag', 'admin', false, '2024-01-15 11:00:00+00'),
(12, 'Priya Sharma', 'psharma@bluewavetelecom.in', 'owner', true, '2024-03-01 12:30:00+00'),
(13, 'Jonas Meyer', 'jmeyer@kineticsauto.de', 'owner', true, '2024-02-18 09:20:00+00'),
(14, 'Tasha Yar', 'tyar@luminasecurity.com', 'admin', true, '2024-03-01 16:05:00+00'),
(15, 'Leo Gallagher', 'leo@solsticecreatives.io', 'owner', true, '2024-02-24 15:10:00+00'),
(16, 'Victor Stone', 'vstone@vertexrobotics.ai', 'owner', true, '2024-03-01 08:50:00+00'),
(16, 'Nadia Belov', 'nbelov@vertexrobotics.ai', 'member', true, '2024-02-29 11:45:00+00'),
(17, 'Kavita Patel', 'kpatel@echomaritime.com', 'owner', true, '2024-02-28 14:00:00+00'),
(18, 'Samira Khan', 'samira@silverlineretail.com', 'billing_manager', true, '2024-03-01 10:40:00+00'),
(19, 'Oliver Queen', 'oliver@crestviewlegal.com', 'owner', true, '2024-02-22 13:15:00+00'),
(20, 'Garrison Ward', 'gward@zenithspace.com', 'owner', true, '2024-03-01 16:30:00+00'),
(20, 'Maya Lin', 'mlin@zenithspace.com', 'admin', true, '2024-03-01 17:10:00+00');

-- Subscriptions (20 rows)
INSERT INTO subscriptions (org_id, status, seats_purchased, current_period_end) VALUES
(1, 'active', 75, '2025-01-15 00:00:00+00'),
(2, 'active', 25, '2024-12-10 00:00:00+00'),
(3, 'active', 120, '2025-02-28 00:00:00+00'),
(4, 'active', 90, '2025-03-04 00:00:00+00'),
(5, 'active', 8, '2024-11-12 00:00:00+00'),
(6, 'active', 200, '2025-05-01 00:00:00+00'),
(7, 'active', 30, '2024-11-18 00:00:00+00'),
(8, 'active', 45, '2025-06-02 00:00:00+00'),
(9, 'active', 110, '2025-06-19 00:00:00+00'),
(10, 'active', 150, '2025-07-08 00:00:00+00'),
(11, 'past_due', 10, '2024-02-22 00:00:00+00'),
(12, 'active', 35, '2024-12-11 00:00:00+00'),
(13, 'active', 5, '2024-11-29 00:00:00+00'),
(14, 'active', 85, '2025-09-05 00:00:00+00'),
(15, 'canceled', 2, '2024-01-17 00:00:00+00'),
(16, 'active', 180, '2025-10-01 00:00:00+00'),
(17, 'trialing', 25, '2024-03-25 00:00:00+00'),
(18, 'active', 40, '2024-12-03 00:00:00+00'),
(19, 'active', 12, '2024-11-20 00:00:00+00'),
(20, 'active', 250, '2025-12-01 00:00:00+00');

-- Audit Logs (25 rows)
INSERT INTO audit_logs (user_id, action, timestamp, ip_address) VALUES
(1, 'user.login', '2024-03-01 10:14:00+00', '198.51.100.12'),
(2, 'member.invite', '2024-03-01 11:30:00+00', '198.51.100.14'),
(3, 'billing.card_updated', '2024-02-28 16:48:00+00', '203.0.113.45'),
(4, 'user.login', '2024-03-01 08:10:00+00', '192.0.2.78'),
(5, 'subscription.seat_upgrade', '2024-02-25 14:35:00+00', '192.0.2.82'),
(6, 'security.mfa_enabled', '2024-03-01 09:12:00+00', '185.199.108.20'),
(7, 'api_key.created', '2024-02-20 12:20:00+00', '198.51.100.56'),
(8, 'sso.configured', '2024-03-01 16:00:00+00', '192.0.2.110'),
(9, 'query.executed', '2024-02-27 17:42:00+00', '192.0.2.115'),
(10, 'user.login', '2024-02-26 13:20:00+00', '203.0.113.89'),
(11, 'export.csv_downloaded', '2024-03-01 14:15:00+00', '198.51.100.99'),
(12, 'integration.slack_connected', '2024-02-28 10:05:00+00', '185.199.109.12'),
(13, 'user.login', '2024-03-01 07:45:00+00', '192.0.2.140'),
(14, 'user.deactivated', '2024-01-15 11:05:00+00', '203.0.113.200'),
(15, 'billing.invoice_downloaded', '2024-03-01 12:35:00+00', '198.51.100.150'),
(16, 'user.login', '2024-02-18 09:20:00+00', '185.199.110.33'),
(17, 'firewall.rule_added', '2024-03-01 16:10:00+00', '192.0.2.210'),
(18, 'user.logout', '2024-02-24 15:30:00+00', '198.51.100.220'),
(19, 'api_key.rotated', '2024-03-01 08:55:00+00', '203.0.113.111'),
(20, 'dataset.imported', '2024-02-29 11:50:00+00', '203.0.113.112'),
(21, 'user.login', '2024-02-28 14:00:00+00', '198.51.100.77'),
(22, 'billing.tax_id_updated', '2024-03-01 10:45:00+00', '192.0.2.66'),
(23, 'role.permission_changed', '2024-02-22 13:20:00+00', '185.199.111.4'),
(24, 'cluster.node_scaled', '2024-03-01 16:35:00+00', '192.0.2.250'),
(25, 'user.login', '2024-03-01 17:10:00+00', '192.0.2.251');

-- ----------------------------------------------------------------------------
-- 3. Dedicated Read-Only Security Role
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'readonly_analyst') THEN
        CREATE ROLE readonly_analyst WITH LOGIN PASSWORD 'readonly_analyst_password';
    END IF;
END
$$;

-- Grant usage on public schema
GRANT CONNECT ON DATABASE enterprise_db TO readonly_analyst;
GRANT USAGE ON SCHEMA public TO readonly_analyst;

-- Grant SELECT only on all existing public tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_analyst;

-- Ensure all future tables created in public schema also grant SELECT only
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON ALL TABLES TO readonly_analyst;

-- Explicitly revoke write, create, and administrative privileges
REVOKE CREATE ON SCHEMA public FROM readonly_analyst;
REVOKE ALL ON SCHEMA information_schema FROM readonly_analyst;

