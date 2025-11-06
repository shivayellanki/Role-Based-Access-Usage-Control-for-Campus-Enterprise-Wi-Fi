const pool = require('../config/database');
const { hashPassword } = require('../utils/password');
require('dotenv').config();

async function seedUsers() {
  try {
    console.log('Seeding users...');

    // Get role IDs
    const rolesResult = await pool.query('SELECT id, name FROM roles');
    const roles = {};
    rolesResult.rows.forEach(role => {
      roles[role.name] = role.id;
    });

    // Hash passwords
    const adminPass = await hashPassword('admin123');
    const studentPass = await hashPassword('student123');
    const facultyPass = await hashPassword('faculty123');
    const staffPass = await hashPassword('staff123');

    // Create users
    const users = [
      {
        username: 'admin',
        email: 'admin@rbwifi.local',
        password: adminPass,
        roleId: roles.Admin,
        fullName: 'System Administrator',
      },
      {
        username: 'student',
        email: 'student@rbwifi.local',
        password: studentPass,
        roleId: roles.Student,
        fullName: 'Test Student',
      },
      {
        username: 'faculty',
        email: 'faculty@rbwifi.local',
        password: facultyPass,
        roleId: roles.Faculty,
        fullName: 'Test Faculty',
      },
      {
        username: 'staff',
        email: 'staff@rbwifi.local',
        password: staffPass,
        roleId: roles.Staff,
        fullName: 'Test Staff',
      },
    ];

    for (const user of users) {
      // Check if user exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [user.username, user.email]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (username, email, password_hash, role_id, full_name, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [user.username, user.email, user.password, user.roleId, user.fullName]
        );
        console.log(`Created user: ${user.username}`);
      } else {
        // Update password
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE username = $2',
          [user.password, user.username]
        );
        console.log(`Updated password for user: ${user.username}`);
      }
    }

    console.log('User seeding completed!');
    console.log('\nDefault credentials:');
    console.log('Admin: admin / admin123');
    console.log('Student: student / student123');
    console.log('Faculty: faculty / faculty123');
    console.log('Staff: staff / staff123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();

