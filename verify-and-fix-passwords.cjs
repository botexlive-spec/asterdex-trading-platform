/**
 * Verify and Fix Test User Passwords
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const USERS_TO_FIX = [
  { email: 'admin@finaster.com', password: 'admin123', role: 'admin' },
  { email: 'user@finaster.com', password: 'user123', role: 'user' }
];

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  console.log('✅ Connected to MySQL');

  for (const userData of USERS_TO_FIX) {
    console.log(`\n🔍 Checking ${userData.email}...`);

    // Get current user
    const [rows] = await connection.execute(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [userData.email]
    );

    if (rows.length === 0) {
      console.log(`❌ User ${userData.email} not found!`);
      continue;
    }

    const user = rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(userData.password, user.password_hash);

    if (isValid) {
      console.log(`✅ Password for ${userData.email} is correct (${userData.password})`);
    } else {
      console.log(`❌ Password for ${userData.email} is INCORRECT, fixing...`);

      // Hash the correct password
      const newHash = await bcrypt.hash(userData.password, 10);

      // Update password
      await connection.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, user.id]
      );

      console.log(`✅ Password updated for ${userData.email} to: ${userData.password}`);

      // Verify the fix
      const verifyValid = await bcrypt.compare(userData.password, newHash);
      console.log(`🔐 Verification: ${verifyValid ? 'SUCCESS' : 'FAILED'}`);
    }
  }

  console.log('\n✅ Password verification/fix complete!\n');

  console.log('📋 Test Credentials:');
  console.log('='.repeat(50));
  console.log('Admin Login:');
  console.log('  Email: admin@finaster.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('User Login:');
  console.log('  Email: user@finaster.com');
  console.log('  Password: user123');
  console.log('='.repeat(50));

  await connection.end();
}

main().catch(console.error);
