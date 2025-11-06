const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own profile unless admin
    if (req.user.role_name !== 'Admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return password hash
    const user = result.rows[0];
    delete user.password_hash;

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole('Admin'),
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role_id').isInt().withMessage('Valid role ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, role_id, full_name, mac_address } = req.body;

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role_id, full_name, mac_address, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, username, email, role_id, full_name, created_at`,
        [username, email, passwordHash, role_id, full_name || null, mac_address || null]
      );

      await logAudit(
        result.rows[0].id,
        req.user.id,
        'USER_CREATED',
        'USER',
        result.rows[0].id,
        { username, email, role_id },
        req.ip || req.connection.remoteAddress
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update user (Admin only)
router.put(
  '/:userId',
  authenticateToken,
  requireRole('Admin'),
  [
    body('email').optional().isEmail(),
    body('role_id').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { email, role_id, full_name, mac_address, is_active } = req.body;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (email !== undefined) {
        updateFields.push(`email = $${paramCount++}`);
        updateValues.push(email);
      }
      if (role_id !== undefined) {
        updateFields.push(`role_id = $${paramCount++}`);
        updateValues.push(role_id);
      }
      if (full_name !== undefined) {
        updateFields.push(`full_name = $${paramCount++}`);
        updateValues.push(full_name);
      }
      if (mac_address !== undefined) {
        updateFields.push(`mac_address = $${paramCount++}`);
        updateValues.push(mac_address);
      }
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);

      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;

      await pool.query(query, updateValues);

      await logAudit(
        parseInt(userId),
        req.user.id,
        'USER_UPDATED',
        'USER',
        parseInt(userId),
        req.body,
        req.ip || req.connection.remoteAddress
      );

      // Get updated user
      const result = await pool.query(
        `SELECT u.*, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [userId]
      );

      const user = result.rows[0];
      delete user.password_hash;

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Block/unblock user (Admin only)
router.post('/:userId/block', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [userId]);

    await logAudit(
      parseInt(userId),
      req.user.id,
      'USER_BLOCKED',
      'USER',
      parseInt(userId),
      {},
      req.ip || req.connection.remoteAddress
    );

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

