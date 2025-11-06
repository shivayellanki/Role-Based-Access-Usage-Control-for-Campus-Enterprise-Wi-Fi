const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Get all roles
router.get('/roles', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all policies
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, r.name as role_name
       FROM policies p
       JOIN roles r ON p.role_id = r.id
       ORDER BY r.name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get policy by role ID
router.get('/role/:roleId', authenticateToken, async (req, res) => {
  try {
    const { roleId } = req.params;

    // Users can only view their own role's policy unless admin
    if (req.user.role_name !== 'Admin' && req.user.role_id !== parseInt(roleId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT p.*, r.name as role_name
       FROM policies p
       JOIN roles r ON p.role_id = r.id
       WHERE p.role_id = $1`,
      [roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update policy
router.put(
  '/:policyId',
  authenticateToken,
  requireRole('Admin'),
  [
    body('bandwidth_down_mbps').optional().isFloat({ min: 0 }),
    body('bandwidth_up_mbps').optional().isFloat({ min: 0 }),
    body('daily_quota_gb').optional().isFloat({ min: 0 }),
    body('session_time_limit_minutes').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { policyId } = req.params;
      const {
        bandwidth_down_mbps,
        bandwidth_up_mbps,
        daily_quota_gb,
        session_time_limit_minutes,
        allowed_hours_start,
        allowed_hours_end,
        blocked_categories,
        access_24x7,
      } = req.body;

      // Get current policy for audit
      const currentPolicy = await pool.query('SELECT * FROM policies WHERE id = $1', [policyId]);
      if (currentPolicy.rows.length === 0) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (bandwidth_down_mbps !== undefined) {
        updateFields.push(`bandwidth_down_mbps = $${paramCount++}`);
        updateValues.push(bandwidth_down_mbps);
      }
      if (bandwidth_up_mbps !== undefined) {
        updateFields.push(`bandwidth_up_mbps = $${paramCount++}`);
        updateValues.push(bandwidth_up_mbps);
      }
      if (daily_quota_gb !== undefined) {
        updateFields.push(`daily_quota_gb = $${paramCount++}`);
        updateValues.push(daily_quota_gb);
      }
      if (session_time_limit_minutes !== undefined) {
        updateFields.push(`session_time_limit_minutes = $${paramCount++}`);
        updateValues.push(session_time_limit_minutes);
      }
      if (allowed_hours_start !== undefined) {
        updateFields.push(`allowed_hours_start = $${paramCount++}`);
        updateValues.push(allowed_hours_start);
      }
      if (allowed_hours_end !== undefined) {
        updateFields.push(`allowed_hours_end = $${paramCount++}`);
        updateValues.push(allowed_hours_end);
      }
      if (blocked_categories !== undefined) {
        updateFields.push(`blocked_categories = $${paramCount++}`);
        updateValues.push(blocked_categories);
      }
      if (access_24x7 !== undefined) {
        updateFields.push(`access_24x7 = $${paramCount++}`);
        updateValues.push(access_24x7);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(policyId);

      const query = `UPDATE policies SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;

      await pool.query(query, updateValues);

      // Log audit
      await logAudit(
        null,
        req.user.id,
        'POLICY_UPDATED',
        'POLICY',
        policyId,
        {
          old: currentPolicy.rows[0],
          new: req.body,
        },
        req.ip || req.connection.remoteAddress
      );

      // Get updated policy
      const result = await pool.query(
        `SELECT p.*, r.name as role_name
         FROM policies p
         JOIN roles r ON p.role_id = r.id
         WHERE p.id = $1`,
        [policyId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating policy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;

