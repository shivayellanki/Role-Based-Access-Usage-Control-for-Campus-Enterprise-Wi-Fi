const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { evaluatePolicy, getUserPolicy } = require('../utils/policyEngine');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Get current user's active session
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, r.name as role_name, u.username, u.email
       FROM sessions s
       JOIN roles r ON s.role_id = r.id
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1 AND s.is_active = true
       ORDER BY s.started_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active session found' });
    }

    const session = result.rows[0];

    // Get policy
    const policy = await getUserPolicy(req.user.id);

    // Evaluate current policy status
    const policyCheck = await evaluatePolicy(req.user.id, session.id);

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const usageResult = await pool.query(
      `SELECT COALESCE(SUM(data_used_bytes), 0) as used_bytes,
              COALESCE(SUM(time_used_minutes), 0) as used_minutes
       FROM usage_tracking
       WHERE user_id = $1 AND date = $2`,
      [req.user.id, today]
    );

    const usage = usageResult.rows[0];

    res.json({
      session,
      policy,
      policyCheck,
      usage: {
        dataUsedBytes: parseInt(usage.used_bytes),
        timeUsedMinutes: parseInt(usage.used_minutes),
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all sessions (Admin only)
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { active, role, limit = 50 } = req.query;

    let query = `
      SELECT s.*, r.name as role_name, u.username, u.email, u.full_name
      FROM sessions s
      JOIN roles r ON s.role_id = r.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND s.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (role) {
      query += ` AND r.name = $${paramCount++}`;
      params.push(role);
    }

    query += ` ORDER BY s.started_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's session history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT s.*, r.name as role_name
       FROM sessions s
       JOIN roles r ON s.role_id = r.id
       WHERE s.user_id = $1
       ORDER BY s.started_at DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect user session (Admin only or own session)
router.post('/:sessionId/disconnect', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists and user has permission
    const sessionResult = await pool.query(
      'SELECT user_id, is_active FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Only admin or session owner can disconnect
    if (req.user.role_name !== 'Admin' && session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      `UPDATE sessions SET is_active = false, ended_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    await logAudit(
      session.user_id,
      req.user.role_name === 'Admin' ? req.user.id : null,
      'SESSION_DISCONNECTED',
      'SESSION',
      sessionId,
      {},
      req.ip || req.connection.remoteAddress
    );

    res.json({ message: 'Session disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

