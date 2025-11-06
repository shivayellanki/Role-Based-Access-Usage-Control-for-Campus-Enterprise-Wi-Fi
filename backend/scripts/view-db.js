const pool = require('../config/database');
require('dotenv').config();

async function viewDatabase() {
  try {
    console.log('\n=== RB-WiFi Database Viewer ===\n');

    console.log('ROLES:');
    const roles = await pool.query('SELECT id, name, description, created_at FROM roles ORDER BY id');
    console.table(roles.rows);

    console.log('\nUSERS:');
    const users = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, r.name as role, u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id`
    );
    console.table(users.rows);

    console.log('\nPOLICIES:');
    const policies = await pool.query(
      `SELECT p.id, r.name as role_name, p.bandwidth_down_mbps, p.bandwidth_up_mbps,
              p.daily_quota_gb, p.session_time_limit_minutes, p.allowed_hours_start,
              p.allowed_hours_end, p.access_24x7
       FROM policies p JOIN roles r ON p.role_id = r.id ORDER BY p.id`
    );
    console.table(policies.rows);

    console.log('\nACTIVE SESSIONS (last 10):');
    const sessions = await pool.query(
      `SELECT s.id, u.username, r.name as role, s.ip_address, s.started_at, s.is_active
       FROM sessions s JOIN users u ON s.user_id = u.id JOIN roles r ON s.role_id = r.id
       ORDER BY s.started_at DESC LIMIT 10`
    );
    console.table(sessions.rows);

    console.log('\nAUDIT LOGS (last 10):');
    const auditLogs = await pool.query(
      `SELECT al.id, u.username, al.action_type, al.resource_type, al.created_at
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 10`
    );
    console.table(auditLogs.rows);

    console.log('\nSUMMARY:');
    const stats = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users) as total_users,
              (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
              (SELECT COUNT(*) FROM sessions WHERE is_active = true) as active_sessions,
              (SELECT COUNT(*) FROM roles) as total_roles,
              (SELECT COUNT(*) FROM policies) as total_policies`
    );
    console.table(stats.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error viewing database:', error);
    process.exit(1);
  }
}

viewDatabase();


