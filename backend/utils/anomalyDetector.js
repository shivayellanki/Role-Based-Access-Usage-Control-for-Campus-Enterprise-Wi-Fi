const cron = require('node-cron');
const pool = require('../config/database');
const { logAudit } = require('./audit');
const socketUtil = require('./socket');

// In-memory cache to prevent spamming the same threat for the same session over and over
const reportedThreats = new Set();

const scanForAnomalies = async () => {
    try {
        // 1. Deactivate expired sessions
        await pool.query(`
            UPDATE sessions 
            SET is_active = false, ended_at = NOW() 
            WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW()
        `);

        // 2. Fetch active sessions
        const activeSessionsResult = await pool.query(`
      SELECT s.id, s.user_id, s.data_used_bytes, s.ip_address, r.name as role_name, u.username
      FROM sessions s
      JOIN roles r ON s.role_id = r.id
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true
    `);

        for (const session of activeSessionsResult.rows) {
            // Increment traffic for active session (100 KB to 500 KB per tick)
            // Kept small so user quotas (e.g. Student 2 GB) aren't exhausted within minutes
            const bytesAdded = Math.floor(Math.random() * (500 - 100 + 1) + 100) * 1024;
            const updatedBytes = Number(session.data_used_bytes || 0) + bytesAdded;

            await pool.query(
                `UPDATE sessions SET data_used_bytes = $1 WHERE id = $2`,
                [updatedBytes, session.id]
            );

            // Update usage_tracking using CURDATE() so it matches MySQL's stored date format
            // (avoids UTC/IST mismatch causing duplicate rows per tick)
            const usageCheck = await pool.query(
                `SELECT id FROM usage_tracking WHERE session_id = $1 AND date = CURDATE() LIMIT 1`,
                [session.id]
            );

            if (usageCheck.rows.length > 0) {
                await pool.query(
                    `UPDATE usage_tracking SET data_used_bytes = data_used_bytes + $1, time_used_minutes = time_used_minutes + 1 WHERE id = $2`,
                    [bytesAdded, usageCheck.rows[0].id]
                );
            } else {
                await pool.query(
                    `INSERT INTO usage_tracking (user_id, session_id, date, data_used_bytes, time_used_minutes) VALUES ($1, $2, CURDATE(), $3, 1)`,
                    [session.user_id, session.id, bytesAdded]
                );
            }

            // Rule 1: Student role exceeding 2GB in a single session rapidly
            const dataUsedMB = updatedBytes / (1024 * 1024);

            let threatFound = false;
            let threatReason = '';
            let severity = 'LOW';

            if (session.role_name === 'Student' && dataUsedMB > 2000) {
                threatFound = true;
                threatReason = `Massive data spike: ${dataUsedMB.toFixed(2)} MB downloaded in a single session by a Student account.`;
                severity = 'HIGH';
            }

            // Rule 2: Possible Bot/Scraping Activity (Guest role downloading > 800MB)
            if (session.role_name === 'Guest' && dataUsedMB > 800) {
                threatFound = true;
                threatReason = `Anomalous Bandwidth Usage: Guest account downloaded ${dataUsedMB.toFixed(2)} MB.`;
                severity = 'CRITICAL';
            }

            const threatKey = `${session.id}-${threatReason}`;

            if (threatFound && !reportedThreats.has(threatKey)) {
                console.warn(`[THREAT DETECTED] ${threatReason} User: ${session.username}`);
                reportedThreats.add(threatKey);

                const details = {
                    anomaly_type: 'BANDWIDTH_SPIKE',
                    severity: severity,
                    description: threatReason,
                    session_id: session.id,
                    username: session.username,
                    role: session.role_name
                };

                await logAudit(
                    session.user_id,
                    null,
                    'THREAT_DETECTED',
                    'SESSION',
                    session.id,
                    details,
                    session.ip_address
                );

                // Broadcast to admin dashboard
                try {
                    socketUtil.getIO().emit('new_threat', details);
                } catch (e) {
                    // Socket might not be ready yet
                }
            }
        }

        if (activeSessionsResult.rows.length > 0) {
            try {
                socketUtil.getIO().emit('session_updated');
            } catch (e) {}
        }
    } catch (error) {
        console.error('Error scanning for anomalies:', error);
    }
};

const startAnomalyDetector = () => {
    // Run every 10 seconds for Ignite 2K26 Demo purposes
    cron.schedule('*/10 * * * * *', () => {
        scanForAnomalies();
    });
    console.log('AI Anomaly Detector Engine started...');
};

module.exports = { startAnomalyDetector, scanForAnomalies };
