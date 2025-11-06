const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { createOTPToken, verifyOTP } = require('../utils/otp');
const { logAudit } = require('../utils/audit');
const { evaluatePolicy } = require('../utils/policyEngine');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs:  60 * 1000, // 1 minute
  max: 50, // 5 requests per window
  message: 'Too many login attempts, please try again later.',
});

// Generate JWT token
const generateToken = (userId, roleId) => {
  return jwt.sign(
    { userId, roleId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Create session
const createSession = async (userId, roleId, token, ipAddress, macAddress) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const result = await pool.query(
    `INSERT INTO sessions (user_id, role_id, session_token, ip_address, mac_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, started_at`,
    [userId, roleId, token, ipAddress, macAddress || null, expiresAt]
  );

  return result.rows[0];
};

// Login with username/password (for internal roles)
router.post(
  '/login',
  authLimiter,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, macAddress } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Find user
      const userResult = await pool.query(
        `SELECT u.*, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE (u.username = $1 OR u.email = $1) AND u.is_active = true`,
        [username]
      );

      if (userResult.rows.length === 0) {
        await logAudit(null, null, 'LOGIN_FAILED', 'USER', null, { username, reason: 'User not found' }, ipAddress);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Check if password-based auth (not OTP-based)
      if (!user.password_hash) {
        await logAudit(user.id, null, 'LOGIN_FAILED', 'USER', null, { username, reason: 'Password not set' }, ipAddress);
        return res.status(401).json({ error: 'This account uses OTP authentication. Please use guest login.' });
      }

      // Verify password
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        await logAudit(user.id, null, 'LOGIN_FAILED', 'USER', null, { username, reason: 'Invalid password' }, ipAddress);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Evaluate policy before allowing login
      const policyCheck = await evaluatePolicy(user.id, null);
      if (!policyCheck.allowed) {
        await logAudit(user.id, null, 'LOGIN_BLOCKED', 'USER', null, { reason: policyCheck.reason }, ipAddress);
        return res.status(403).json({ error: policyCheck.reason });
      }

      // Generate token
      const token = generateToken(user.id, user.role_id);

      // Create session
      const session = await createSession(user.id, user.role_id, token, ipAddress, macAddress);

      // Log successful login
      await logAudit(user.id, null, 'LOGIN_SUCCESS', 'USER', null, { role: user.role_name }, ipAddress);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role_name,
          fullName: user.full_name,
        },
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Guest login - Request OTP
router.post(
  '/guest/request-otp',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Get Guest role
      const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'Guest'");
      if (roleResult.rows.length === 0) {
        return res.status(500).json({ error: 'Guest role not found' });
      }

      const guestRoleId = roleResult.rows[0].id;

      // Create or get guest user
      let userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let userId;
      if (userResult.rows.length === 0) {
        // Create new guest user
        const newUser = await pool.query(
          `INSERT INTO users (username, email, role_id, full_name, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [email.split('@')[0], email, guestRoleId, `Guest: ${email}`]
        );
        userId = newUser.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
        // Update role to Guest if needed
        if (userResult.rows[0].role_id !== guestRoleId) {
          await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [guestRoleId, userId]);
        }
      }

      // Create and send OTP
      await createOTPToken(email);

      res.json({ message: 'OTP sent to your email' });
    } catch (error) {
      console.error('OTP request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Guest login - Verify OTP
router.post(
  '/guest/verify-otp',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp, macAddress } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Verify OTP
      const otpResult = await verifyOTP(email, otp);
      if (!otpResult.valid) {
        await logAudit(null, null, 'LOGIN_FAILED', 'USER', null, { email, reason: 'Invalid OTP' }, ipAddress);
        return res.status(401).json({ error: otpResult.error });
      }

      // Get user
      const userResult = await pool.query(
        `SELECT u.*, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Evaluate policy
      const policyCheck = await evaluatePolicy(user.id, null);
      if (!policyCheck.allowed) {
        await logAudit(user.id, null, 'LOGIN_BLOCKED', 'USER', null, { reason: policyCheck.reason }, ipAddress);
        return res.status(403).json({ error: policyCheck.reason });
      }

      // Generate token
      const token = generateToken(user.id, user.role_id);

      // Create session
      const session = await createSession(user.id, user.role_id, token, ipAddress, macAddress);

      // Log successful login
      await logAudit(user.id, null, 'LOGIN_SUCCESS', 'USER', null, { role: user.role_name }, ipAddress);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role_name,
          fullName: user.full_name,
        },
        sessionId: session.id,
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await pool.query(
        `UPDATE sessions SET is_active = false, ended_at = NOW()
         WHERE session_token = $1 AND is_active = true`,
        [token]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

