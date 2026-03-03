const pool = require('../config/database');
const crypto = require('crypto');

// Utility to generate a random IP address
function getRandomIp() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Utility to generate a random MAC address
function getRandomMac() {
    return "XX:XX:XX:XX:XX:XX".replace(/X/g, function () {
        return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16));
    });
}

const run = async () => {
    try {
        console.log('Connecting to database...');

        // Ensure users exist first
        const usersResult = await pool.query('SELECT u.id, u.role_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id');
        let users = usersResult.rows;

        if (users.length === 0) {
            console.log('No users found in database. Setting up mock users first...');
            const seedProcess = require('child_process').spawnSync('npm', ['run', 'seed-users'], { stdio: 'inherit' });
            if (seedProcess.error) throw seedProcess.error;

            const recheckUsers = await pool.query('SELECT u.id, u.role_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id');
            users = recheckUsers.rows;
        }

        console.log(`Found ${users.length} users. Generating mock data...`);

        // Insert Session Data
        for (let i = 0; i < 15; i++) {
            // Pick a random user
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const dataUsedMb = Math.floor(Math.random() * 1000); // 0 to 1000 MB
            const bandwidthUsage = (Math.random() * 10).toFixed(2); // 0 to 10 Mbps
            const ip = getRandomIp();
            const mac = getRandomMac();

            // Insert into sessions table, flag it as 'mock_data' in the MAC address for easy cleanup
            const insertSession = `
                INSERT INTO sessions (user_id, role_id, session_token, ip_address, mac_address, is_active, data_used_bytes, current_bandwidth_mbps)
                VALUES ($1, $2, $3, $4, $5, true, $6, $7)
                RETURNING id;
            `;
            const sessionRes = await pool.query(insertSession, [
                randomUser.id,
                randomUser.role_id,
                sessionToken,
                ip,
                mac, // Real looking MAC address without MOCK_ prefix
                dataUsedMb * 1024 * 1024, // Convert MB to bytes
                bandwidthUsage
            ]);

            const sessionId = sessionRes.rows[0].id;

            // Generate Usage Tracking Data
            const insertUsage = `
                INSERT INTO usage_tracking (user_id, session_id, date, data_used_bytes, time_used_minutes)
                VALUES ($1, $2, CURRENT_DATE, $3, $4)
            `;
            const timeUsed = Math.floor(Math.random() * 180); // 0 to 180 minutes
            await pool.query(insertUsage, [
                randomUser.id,
                sessionId,
                dataUsedMb * 1024 * 1024,
                timeUsed
            ]);

            // Generate Audit Log
            const insertAudit = `
                INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            await pool.query(insertAudit, [
                randomUser.id,
                'LOGIN',
                'SESSION',
                sessionId,
                JSON.stringify({ note: "Mock auto-generated session" }),
                ip
            ]);
        }

        console.log('✅ Successfully generated 15 active sessions, usage tracking data, and audit logs!');
        console.log('Start the dev server and view the Admin Dashboard to see changes.');

    } catch (err) {
        console.error('❌ Error generating data:', err);
    } finally {
        await pool.end();
        process.exit();
    }
};

run();
