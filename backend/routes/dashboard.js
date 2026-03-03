const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard stats
router.get('/admin', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    // Active sessions count
    const activeSessionsResult = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE is_active = true'
    );
    const activeSessions = parseInt(activeSessionsResult.rows[0].count);

    // Total users count
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Sessions by role
    const sessionsByRoleResult = await pool.query(
      `SELECT r.name as role, COUNT(*) as count
       FROM sessions s
       JOIN roles r ON s.role_id = r.id
       WHERE s.is_active = true
       GROUP BY r.name`
    );

    // Top users by data usage (today)
    const today = new Date().toISOString().split('T')[0];
    const topUsersResult = await pool.query(
      `SELECT u.username, u.email, r.name as role, SUM(ut.data_used_bytes) as total_bytes
       FROM usage_tracking ut
       JOIN users u ON ut.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ut.date = $1
       GROUP BY u.id, u.username, u.email, r.name
       ORDER BY total_bytes DESC
       LIMIT 10`,
      [today]
    );

    // Recent violations
    const violationsResult = await pool.query(
      `SELECT pv.*, u.username, u.email, r.name as role
       FROM policy_violations pv
       JOIN users u ON pv.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       ORDER BY pv.created_at DESC
       LIMIT 20`
    );

    // Data usage by role (today)
    const usageByRoleResult = await pool.query(
      `SELECT r.name as role, SUM(ut.data_used_bytes) as total_bytes
       FROM usage_tracking ut
       JOIN users u ON ut.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ut.date = $1
       GROUP BY r.name`,
      [today]
    );

    res.json({
      activeSessions,
      totalUsers,
      sessionsByRole: sessionsByRoleResult.rows,
      topUsers: topUsersResult.rows.map(user => ({
        ...user,
        total_bytes: parseInt(user.total_bytes || 0),
      })),
      violations: violationsResult.rows,
      usageByRole: usageByRoleResult.rows.map(role => ({
        ...role,
        total_bytes: parseInt(role.total_bytes || 0),
      })),
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User dashboard stats
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get user's policy
    const policyResult = await pool.query(
      `SELECT p.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN policies p ON p.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    const policy = policyResult.rows[0];

    // Get today's usage
    const usageResult = await pool.query(
       `SELECT COALESCE(SUM(data_used_bytes), 0) as used_bytes,
              COALESCE(SUM(time_used_minutes), 0) as used_minutes
       FROM usage_tracking
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    const usage = usageResult.rows[0];
    const usedBytes = parseInt(usage.used_bytes);
    const quotaBytes = policy.daily_quota_gb ? policy.daily_quota_gb * 1024 * 1024 * 1024 : null;

    // Get active session
    const sessionResult = await pool.query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND is_active = true
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    // Get session history count
    const historyResult = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [userId]
    );

    res.json({
      policy: {
        role: policy.role_name,
        bandwidth_down_mbps: policy.bandwidth_down_mbps,
        bandwidth_up_mbps: policy.bandwidth_up_mbps,
        daily_quota_gb: policy.daily_quota_gb,
        session_time_limit_minutes: policy.session_time_limit_minutes,
        allowed_hours: policy.access_24x7
          ? '24/7'
          : `${policy.allowed_hours_start || 'N/A'} - ${policy.allowed_hours_end || 'N/A'}`,
        blocked_categories: policy.blocked_categories || [],
      },
      usage: {
        dataUsedBytes: usedBytes,
        dataUsedGB: (usedBytes / (1024 * 1024 * 1024)).toFixed(2),
        quotaBytes: quotaBytes,
        quotaGB: policy.daily_quota_gb || null,
        remainingBytes: quotaBytes ? quotaBytes - usedBytes : null,
        remainingGB: quotaBytes ? ((quotaBytes - usedBytes) / (1024 * 1024 * 1024)).toFixed(2) : null,
        timeUsedMinutes: parseInt(usage.used_minutes),
      },
      activeSession: sessionResult.rows[0] || null,
      totalSessions: parseInt(historyResult.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit logs (Admin only)
router.get('/audit-logs', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { limit = 100, actionType, userId } = req.query;

    let query = `
      SELECT al.*, u.username as user_username, a.username as admin_username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN users a ON al.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (actionType) {
      query += ` AND al.action_type = $${paramCount++}`;
      params.push(actionType);
    }

    if (userId) {
      query += ` AND al.user_id = $${paramCount++}`;
      params.push(userId);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

