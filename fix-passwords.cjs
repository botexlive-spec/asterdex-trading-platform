const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  console.log('✅ Connected to MySQL');

  // Generate password hashes
  const admin123Hash = await bcrypt.hash('admin123', 10);
  const user123Hash = await bcrypt.hash('user123', 10);

  console.log('\n📝 Generated hashes:');
  console.log('admin123:', admin123Hash);
  console.log('user123:', user123Hash);

  // Update passwords
  await connection.execute(
    'UPDATE users SET password_hash = ? WHERE email IN (?, ?)',
    [admin123Hash, 'admin@finaster.com', 'admin@asterdex.com']
  );

  await connection.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [user123Hash, 'user@finaster.com']
  );

  console.log('\n✅ Passwords updated successfully!');
  console.log('\nLogin credentials:');
  console.log('Admin: admin@finaster.com / admin123');
  console.log('Admin: admin@asterdex.com / admin123');
  console.log('User:  user@finaster.com / user123');

  await connection.end();
}

fixPasswords().catch(console.error);
