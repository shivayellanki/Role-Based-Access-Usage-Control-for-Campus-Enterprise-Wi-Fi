const pool = require('../config/database');
const { logAudit } = require('./audit');

// Check if current time is within allowed hours
const checkTimeRestriction = (policy) => {
  if (policy.access_24x7) {
    return { allowed: true };
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format

  if (policy.allowed_hours_start && policy.allowed_hours_end) {
    if (currentTime >= policy.allowed_hours_start && currentTime <= policy.allowed_hours_end) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Access denied. Allowed hours: ${policy.allowed_hours_start} - ${policy.allowed_hours_end}`,
    };
  }

  return { allowed: true };
};

// Check daily quota
const checkQuota = async (userId, policy) => {
  if (!policy.daily_quota_gb) {
    return { allowed: true, remaining: null };
  }

  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT COALESCE(SUM(data_used_bytes), 0) as used_bytes
     FROM usage_tracking
     WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );

  const usedBytes = parseInt(result.rows[0].used_bytes);
  const quotaBytes = policy.daily_quota_gb * 1024 * 1024 * 1024;
  const remaining = quotaBytes - usedBytes;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: 'Daily quota exceeded',
      used: usedBytes,
      quota: quotaBytes,
    };
  }

  return {
    allowed: true,
    remaining: remaining,
    used: usedBytes,
    quota: quotaBytes,
  };
};

// Check session time limit
const checkSessionTimeLimit = async (sessionId, policy) => {
  if (!policy.session_time_limit_minutes) {
    return { allowed: true };
  }

  const result = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_elapsed
     FROM sessions
     WHERE id = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return { allowed: false, reason: 'Session not found' };
  }

  const minutesElapsed = Math.floor(result.rows[0].minutes_elapsed);

  if (minutesElapsed >= policy.session_time_limit_minutes) {
    return {
      allowed: false,
      reason: `Session time limit (${policy.session_time_limit_minutes} min) exceeded`,
    };
  }

  return {
    allowed: true,
    remaining: policy.session_time_limit_minutes - minutesElapsed,
  };
};

// Check category blocking
const checkCategoryBlock = (url, policy) => {
  if (!policy.blocked_categories || policy.blocked_categories.length === 0) {
    return { allowed: true };
  }

  // Simple category detection (in production, use proper content filtering service)
  const urlLower = url.toLowerCase();
  const blocked = policy.blocked_categories || [];

  if (blocked.includes('P2P')) {
    const p2pKeywords = ['torrent', 'bittorrent', 'utorrent', 'peer', 'magnet:'];
    if (p2pKeywords.some(keyword => urlLower.includes(keyword))) {
      return {
        allowed: false,
        reason: 'P2P/torrenting is blocked for your role',
        category: 'P2P',
      };
    }
  }

  return { allowed: true };
};

// Main policy evaluation function
const evaluatePolicy = async (userId, sessionId, url = null) => {
  try {
    // Get user's role and policy
    const userResult = await pool.query(
      `SELECT u.id, u.role_id, r.name as role_name, p.*
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN policies p ON p.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return {
        allowed: false,
        reason: 'User or policy not found',
      };
    }

    const policy = userResult.rows[0];

    // Admins are exempt from policy restrictions
    if (policy.role_name === 'Admin') {
      return {
        allowed: true,
        policy: {
          bandwidth_down: policy.bandwidth_down_mbps,
          bandwidth_up: policy.bandwidth_up_mbps,
          quota: { allowed: true, remaining: null, used: 0, quota: null },
          session_limit: null,
        },
      };
    }

    // Check time restriction
    const timeCheck = checkTimeRestriction(policy);
    if (!timeCheck.allowed) {
      await logViolation(userId, sessionId, 'TIME_RESTRICTION', timeCheck.reason);
      return timeCheck;
    }

    // Check quota
    const quotaCheck = await checkQuota(userId, policy);
    if (!quotaCheck.allowed) {
      await logViolation(userId, sessionId, 'QUOTA_EXCEEDED', quotaCheck.reason);
      return quotaCheck;
    }

    // Check session time limit
    if (sessionId) {
      const sessionCheck = await checkSessionTimeLimit(sessionId, policy);
      if (!sessionCheck.allowed) {
        await logViolation(userId, sessionId, 'SESSION_TIME_LIMIT', sessionCheck.reason);
        return sessionCheck;
      }
    }

    // Check category blocking (if URL provided)
    if (url) {
      const categoryCheck = checkCategoryBlock(url, policy);
      if (!categoryCheck.allowed) {
        await logViolation(userId, sessionId, 'CATEGORY_BLOCKED', categoryCheck.reason);
        return categoryCheck;
      }
    }

    // All checks passed
    return {
      allowed: true,
      policy: {
        bandwidth_down: policy.bandwidth_down_mbps,
        bandwidth_up: policy.bandwidth_up_mbps,
        quota: quotaCheck,
        session_limit: policy.session_time_limit_minutes,
      },
    };
  } catch (error) {
    console.error('Policy evaluation error:', error);
    return {
      allowed: false,
      reason: 'Policy evaluation error',
    };
  }
};

// Log policy violation
const logViolation = async (userId, sessionId, violationType, details) => {
  try {
    await pool.query(
      `INSERT INTO policy_violations (user_id, session_id, violation_type, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, sessionId, violationType, details]
    );
  } catch (error) {
    console.error('Error logging violation:', error);
  }
};

// Get policy for user
const getUserPolicy = async (userId) => {
  const result = await pool.query(
    `SELECT r.name as role_name, p.*
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN policies p ON p.role_id = r.id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  evaluatePolicy,
  getUserPolicy,
  checkTimeRestriction,
  checkQuota,
  checkSessionTimeLimit,
  checkCategoryBlock,
};


