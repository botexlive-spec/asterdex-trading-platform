const mysql = require('mysql2/promise');

async function addEarningsColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  console.log('📊 Adding missing earnings columns to users table...\n');

  // Check if columns exist
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'finaster_mlm' AND TABLE_NAME = 'users'"
  );

  const columnNames = columns.map(c => c.COLUMN_NAME);

  // Add roi_earnings if not exists
  if (!columnNames.includes('roi_earnings')) {
    await connection.execute('ALTER TABLE users ADD COLUMN roi_earnings DECIMAL(15,6) DEFAULT 0.000000');
    console.log('✅ Added roi_earnings column');
  } else {
    console.log('✓ roi_earnings column already exists');
  }

  // Add commission_earnings if not exists
  if (!columnNames.includes('commission_earnings')) {
    await connection.execute('ALTER TABLE users ADD COLUMN commission_earnings DECIMAL(15,6) DEFAULT 0.000000');
    console.log('✅ Added commission_earnings column');
  } else {
    console.log('✓ commission_earnings column already exists');
  }

  // Add binary_earnings if not exists
  if (!columnNames.includes('binary_earnings')) {
    await connection.execute('ALTER TABLE users ADD COLUMN binary_earnings DECIMAL(15,6) DEFAULT 0.000000');
    console.log('✅ Added binary_earnings column');
  } else {
    console.log('✓ binary_earnings column already exists');
  }

  // Verify
  const [newColumns] = await connection.execute(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'finaster_mlm' AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('roi_earnings', 'commission_earnings', 'binary_earnings')"
  );

  console.log('\n📋 Verified columns:');
  newColumns.forEach(col => {
    console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
  });

  await connection.end();
  console.log('\n✅ Database schema updated successfully!');
}

addEarningsColumns().catch(console.error);
