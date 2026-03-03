const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get active threats (Audit logs of type THREAT_DETECTED)
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const result = await pool.query(
            `SELECT id, user_id, action_type, details, ip_address, created_at
       FROM audit_logs
       WHERE action_type = 'THREAT_DETECTED'
       ORDER BY created_at DESC
       LIMIT $1`,
            [parseInt(limit)]
        );

        res.json(result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            timestamp: row.created_at,
            ipAddress: row.ip_address,
            ...row.details
        })));
    } catch (error) {
        console.error('Error fetching threats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
