-- RB-WiFi Database Schema
-- Role-Based Access Control for Campus/Enterprise Wi-Fi

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies Table
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    bandwidth_down_mbps DECIMAL(10,2),
    bandwidth_up_mbps DECIMAL(10,2),
    daily_quota_gb DECIMAL(10,2),
    session_time_limit_minutes INTEGER,
    allowed_hours_start TIME,
    allowed_hours_end TIME,
    blocked_categories TEXT[], -- Array of blocked content categories
    domain_whitelist TEXT[], -- Array of whitelisted domains (for guests)
    access_24x7 BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OTP-based auth
    role_id INTEGER REFERENCES roles(id),
    full_name VARCHAR(255),
    mac_address VARCHAR(17), -- Optional MAC binding
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Tokens Table (for Guest authentication)
CREATE TABLE IF NOT EXISTS otp_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    data_used_bytes BIGINT DEFAULT 0,
    current_bandwidth_mbps DECIMAL(10,2)
);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    data_used_bytes BIGINT DEFAULT 0,
    time_used_minutes INTEGER DEFAULT 0,
    regularity_blocks INTEGER DEFAULT 0, -- Count of blocked access attempts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, POLICY_CHANGE, USER_BLOCKED, etc.
    resource_type VARCHAR(50), -- USER, POLICY, ROLE, etc.
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy Violations Table
CREATE TABLE IF NOT EXISTS policy_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL, -- QUOTA_EXCEEDED, TIME_RESTRICTION, CATEGORY_BLOCKED, etc.
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_otp_email_expires ON otp_tokens(email, expires_at, used);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('Admin', 'System administrators with full access'),
    ('Faculty', 'Faculty members with high bandwidth and 24x7 access'),
    ('Staff', 'Staff members with business hours access'),
    ('Student', 'Students with limited bandwidth and quotas'),
    ('Guest', 'Temporary guests with strict restrictions')
ON CONFLICT (name) DO NOTHING;

-- Insert default policies
INSERT INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, access_24x7)
SELECT r.id, 999.99, 999.99, NULL, NULL, NULL, NULL, ARRAY[]::TEXT[], true
FROM roles r WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, access_24x7)
SELECT r.id, 20, 5, 10, NULL, NULL, NULL, ARRAY[]::TEXT[], true
FROM roles r WHERE r.name = 'Faculty'
ON CONFLICT DO NOTHING;

INSERT INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, access_24x7)
SELECT r.id, 10, 2, 5, NULL, '09:00:00', '17:00:00', ARRAY[]::TEXT[], false
FROM roles r WHERE r.name = 'Staff'
ON CONFLICT DO NOTHING;

INSERT INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, access_24x7)
SELECT r.id, 5, 1, 2, 120, '06:00:00', '23:00:00', ARRAY['P2P']::TEXT[], false
FROM roles r WHERE r.name = 'Student'
ON CONFLICT DO NOTHING;

INSERT INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 2, 0.5, 0.5, NULL, '09:00:00', '18:00:00', ARRAY[]::TEXT[], ARRAY[]::TEXT[], false
FROM roles r WHERE r.name = 'Guest'
ON CONFLICT DO NOTHING;

-- Note: Default admin user will be created via seed-users.js script
-- Or manually create with: npm run seed-users

