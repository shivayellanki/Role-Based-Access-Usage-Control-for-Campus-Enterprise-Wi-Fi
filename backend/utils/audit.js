const pool = require('../config/database');

const logAudit = async (userId, adminId, actionType, resourceType, resourceId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, admin_id, action_type, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, adminId || null, actionType, resourceType || null, resourceId || null, JSON.stringify(details || {}), ipAddress || null]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

module.exports = { logAudit };

