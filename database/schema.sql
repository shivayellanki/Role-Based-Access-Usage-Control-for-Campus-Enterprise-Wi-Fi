-- RB-WiFi Database Schema (MySQL version)
-- Role-Based Access Control for Campus/Enterprise Wi-Fi

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Policies Table
CREATE TABLE IF NOT EXISTS policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NULL,
    bandwidth_down_mbps DECIMAL(10,2),
    bandwidth_up_mbps DECIMAL(10,2),
    daily_quota_gb DECIMAL(10,2),
    session_time_limit_minutes INT,
    allowed_hours_start TIME,
    allowed_hours_end TIME,
    blocked_categories JSON, -- JSON Array for content categories
    domain_whitelist JSON, -- JSON Array for whitelisted domains (for guests)
    access_24x7 BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OTP-based auth
    role_id INT NULL,
    full_name VARCHAR(255),
    mac_address VARCHAR(17), -- Optional MAC binding
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_users_role (role_id),
    INDEX idx_users_email (email)
);

-- OTP Tokens Table (for Guest authentication)
CREATE TABLE IF NOT EXISTS otp_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_email_expires (email, expires_at, used)
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    role_id INT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    ended_at TIMESTAMP NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    data_used_bytes BIGINT DEFAULT 0,
    current_bandwidth_mbps DECIMAL(10,2),
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_active (is_active),
    INDEX idx_sessions_token (session_token)
);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id INT NULL,
    date DATE NOT NULL,
    data_used_bytes BIGINT DEFAULT 0,
    time_used_minutes INT DEFAULT 0,
    regularity_blocks INT DEFAULT 0, -- Count of blocked access attempts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_usage_user_date (user_id, date)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    admin_id INT NULL,
    action_type VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, POLICY_CHANGE, USER_BLOCKED, etc.
    resource_type VARCHAR(50), -- USER, POLICY, ROLE, etc.
    resource_id INT,
    details JSON, -- Native JSON column
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at)
);

-- Policy Violations Table
CREATE TABLE IF NOT EXISTS policy_violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id INT NULL,
    violation_type VARCHAR(100) NOT NULL, -- QUOTA_EXCEEDED, TIME_RESTRICTION, CATEGORY_BLOCKED, etc.
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Insert default roles (INSERT IGNORE acts as ON CONFLICT DO NOTHING for MySQL)
INSERT IGNORE INTO roles (id, name, description) VALUES
    (1, 'Admin', 'System administrators with full access'),
    (2, 'Faculty', 'Faculty members with high bandwidth and 24x7 access'),
    (3, 'Staff', 'Staff members with business hours access'),
    (4, 'Student', 'Students with limited bandwidth and quotas'),
    (5, 'Guest', 'Temporary guests with strict restrictions');

-- Insert default policies
INSERT IGNORE INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 999.99, 999.99, NULL, NULL, NULL, NULL, '[]', '[]', true
FROM roles r WHERE r.name = 'Admin';

INSERT IGNORE INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 20.00, 5.00, 10.00, NULL, NULL, NULL, '[]', '[]', true
FROM roles r WHERE r.name = 'Faculty';

INSERT IGNORE INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 10.00, 2.00, 5.00, NULL, '09:00:00', '17:00:00', '[]', '[]', false
FROM roles r WHERE r.name = 'Staff';

INSERT IGNORE INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 5.00, 1.00, 2.00, 120, '06:00:00', '23:00:00', '["P2P"]', '[]', false
FROM roles r WHERE r.name = 'Student';

INSERT IGNORE INTO policies (role_id, bandwidth_down_mbps, bandwidth_up_mbps, daily_quota_gb, session_time_limit_minutes, allowed_hours_start, allowed_hours_end, blocked_categories, domain_whitelist, access_24x7)
SELECT r.id, 2.00, 0.50, 0.50, NULL, '09:00:00', '18:00:00', '[]', '[]', false
FROM roles r WHERE r.name = 'Guest';
