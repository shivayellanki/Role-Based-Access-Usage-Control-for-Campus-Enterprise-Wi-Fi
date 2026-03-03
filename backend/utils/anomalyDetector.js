const cron = require('node-cron');
const pool = require('../config/database');
const { logAudit } = require('./audit');
const socketUtil = require('./socket');

// In-memory cache to prevent spamming the same threat for the same session over and over
const reportedThreats = new Set();

const scanForAnomalies = async () => {
    try {
        // Look for active sessions that exceed 1 GB downloaded or having unusual parameters (Student downloading > 2GB)
        const activeSessionsResult = await pool.query(`
      SELECT s.id, s.user_id, s.data_used_bytes, s.ip_address, r.name as role_name, u.username
      FROM sessions s
      JOIN roles r ON s.role_id = r.id
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true
    `);

        for (const session of activeSessionsResult.rows) {
            // Rule 1: Student role exceeding 2GB (2147483648 bytes) in a single session rapidly
            const dataUsedMB = session.data_used_bytes / (1024 * 1024);

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
