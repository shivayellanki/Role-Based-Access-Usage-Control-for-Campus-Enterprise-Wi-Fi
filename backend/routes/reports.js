const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get usage report
router.get('/usage', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { startDate, endDate, role, userId } = req.query;

    let query = `
      SELECT 
        u.username,
        u.email,
        r.name as role_name,
        ut.date,
        SUM(ut.data_used_bytes) as total_bytes,
        SUM(ut.time_used_minutes) as total_minutes,
        COUNT(DISTINCT ut.session_id) as session_count
      FROM usage_tracking ut
      JOIN users u ON ut.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND ut.date >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND ut.date <= $${paramCount++}`;
      params.push(endDate);
    }

    if (role) {
      query += ` AND r.name = $${paramCount++}`;
      params.push(role);
    }

    if (userId) {
      query += ` AND u.id = $${paramCount++}`;
      params.push(userId);
    }

    query += `
      GROUP BY u.id, u.username, u.email, r.name, ut.date
      ORDER BY ut.date DESC, total_bytes DESC
    `;

    const result = await pool.query(query, params);

    res.json(
      result.rows.map(row => ({
        ...row,
        total_bytes: parseInt(row.total_bytes || 0),
        total_minutes: parseInt(row.total_minutes || 0),
        total_gb: (parseInt(row.total_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
      }))
    );
  } catch (error) {
    console.error('Error generating usage report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get violations report
router.get('/violations', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { startDate, endDate, violationType } = req.query;

    let query = `
      SELECT 
        pv.*,
        u.username,
        u.email,
        r.name as role_name,
        s.started_at as session_started
      FROM policy_violations pv
      JOIN users u ON pv.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN sessions s ON pv.session_id = s.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND pv.created_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND pv.created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    if (violationType) {
      query += ` AND pv.violation_type = $${paramCount++}`;
      params.push(violationType);
    }

    query += ` ORDER BY pv.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error generating violations report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

