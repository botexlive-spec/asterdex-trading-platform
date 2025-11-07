const mysql = require('mysql2/promise');
const axios = require('axios');

const API_URL = 'http://localhost:3001';
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message, data = null) {
  const result = { name, status, message, data, timestamp: new Date().toISOString() };
  testResults.tests.push(result);

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);

  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.warnings++;
}

async function testAuthentication() {
  console.log('\n🔐 PHASE 1: AUTHENTICATION TESTING');
  console.log('='.repeat(60));

  try {
    // Test admin login
    const adminResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@finaster.com',
      password: 'admin123'
    });

    if (adminResponse.data.token && adminResponse.data.user.role === 'admin') {
      logTest('Admin Login', 'PASS', 'Successfully authenticated with admin credentials');
    } else {
      logTest('Admin Login', 'FAIL', 'Invalid response structure');
    }

    // Test user login
    const userResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'user@finaster.com',
      password: 'user123'
    });

    if (userResponse.data.token && userResponse.data.user.role === 'user') {
      logTest('User Login', 'PASS', 'Successfully authenticated with user credentials');
      return userResponse.data.token; // Return token for further tests
    } else {
      logTest('User Login', 'FAIL', 'Invalid response structure');
    }

    // Test invalid login
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        email: 'invalid@test.com',
        password: 'wrong'
      });
      logTest('Invalid Login Rejection', 'FAIL', 'Should have rejected invalid credentials');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Invalid Login Rejection', 'PASS', 'Correctly rejected invalid credentials');
      }
    }

    return userResponse.data.token;
  } catch (error) {
    logTest('Authentication', 'FAIL', `Error: ${error.message}`);
    return null;
  }
}

async function testDashboardAPI(token) {
  console.log('\n📊 PHASE 2: DASHBOARD API TESTING');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dashboard = response.data;

    // Verify structure
    if (dashboard.user && dashboard.statistics && dashboard.packages) {
      logTest('Dashboard Structure', 'PASS', 'All required sections present');
    } else {
      logTest('Dashboard Structure', 'FAIL', 'Missing required sections');
      return;
    }

    // Check for real data (not mock)
    if (dashboard.statistics.left_binary_volume !== 16000) {
      logTest('Binary Volume Calculation', 'PASS', 'Using real database values');
    } else {
      logTest('Binary Volume Calculation', 'WARN', 'May still be using mock data');
    }

    // Verify earnings breakdown
    if ('roi_earnings' in dashboard.user && 'commission_earnings' in dashboard.user) {
      logTest('Earnings Breakdown', 'PASS', 'All earnings fields present');
    } else {
      logTest('Earnings Breakdown', 'FAIL', 'Missing earnings breakdown fields');
    }

  } catch (error) {
    logTest('Dashboard API', 'FAIL', `Error: ${error.message}`);
  }
}

async function testDatabaseSchema(connection) {
  console.log('\n🗄️ PHASE 3: DATABASE SCHEMA VALIDATION');
  console.log('='.repeat(60));

  try {
    // Check for required tables
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'finaster_mlm'"
    );

    const requiredTables = ['users', 'packages', 'user_packages', 'commissions', 'mlm_transactions', 'ranks'];
    const existingTables = tables.map(t => t.TABLE_NAME);

    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        logTest(`Table: ${table}`, 'PASS', 'Table exists');
      } else {
        logTest(`Table: ${table}`, 'FAIL', 'Table missing');
      }
    });

    // Check for new earnings columns
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'finaster_mlm' AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('roi_earnings', 'commission_earnings', 'binary_earnings')"
    );

    if (columns.length === 3) {
      logTest('Earnings Columns', 'PASS', 'All earnings columns added to users table');
    } else {
      logTest('Earnings Columns', 'FAIL', `Only ${columns.length}/3 earnings columns found`);
    }

    // Check data integrity
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [packages] = await connection.execute('SELECT COUNT(*) as count FROM packages');

    logTest('User Data', 'PASS', `${users[0].count} users in database`);
    logTest('Package Data', 'PASS', `${packages[0].count} packages configured`);

  } catch (error) {
    logTest('Database Schema', 'FAIL', `Error: ${error.message}`);
  }
}

async function testBusinessLogic(connection) {
  console.log('\n💼 PHASE 4: BUSINESS LOGIC VALIDATION');
  console.log('='.repeat(60));

  try {
    // Check package configuration
    const [packages] = await connection.execute(
      'SELECT * FROM packages WHERE is_active = 1'
    );

    packages.forEach(pkg => {
      const hasValidROI = parseFloat(pkg.daily_roi_percentage) > 0;
      const hasValidDuration = pkg.duration_days > 0;
      const hasCommissionStructure = pkg.level_income_percentages !== null;

      if (hasValidROI && hasValidDuration && hasCommissionStructure) {
        logTest(`Package: ${pkg.name}`, 'PASS', `ROI: ${pkg.daily_roi_percentage}%, Duration: ${pkg.duration_days} days`);
      } else {
        logTest(`Package: ${pkg.name}`, 'FAIL', 'Invalid package configuration');
      }
    });

    // Check rank configuration
    const [ranks] = await connection.execute('SELECT COUNT(*) as count FROM ranks');
    if (ranks[0].count >= 10) {
      logTest('Rank System', 'PASS', `${ranks[0].count} ranks configured`);
    } else {
      logTest('Rank System', 'WARN', `Only ${ranks[0].count} ranks found`);
    }

  } catch (error) {
    logTest('Business Logic', 'FAIL', `Error: ${error.message}`);
  }
}

async function testDataIntegrity(connection) {
  console.log('\n🔍 PHASE 5: DATA INTEGRITY CHECKS');
  console.log('='.repeat(60));

  try {
    // Check for orphaned records
    const [orphanedPackages] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_packages WHERE user_id NOT IN (SELECT id FROM users)'
    );

    if (orphanedPackages[0].count === 0) {
      logTest('Orphaned User Packages', 'PASS', 'No orphaned records found');
    } else {
      logTest('Orphaned User Packages', 'FAIL', `${orphanedPackages[0].count} orphaned records`);
    }

    // Check for invalid sponsor relationships
    const [invalidSponsors] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE sponsor_id IS NOT NULL AND sponsor_id NOT IN (SELECT id FROM users)'
    );

    if (invalidSponsors[0].count === 0) {
      logTest('Invalid Sponsor Relationships', 'PASS', 'All sponsor IDs valid');
    } else {
      logTest('Invalid Sponsor Relationships', 'FAIL', `${invalidSponsors[0].count} invalid relationships`);
    }

    // Check for negative balances
    const [negativeBalances] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE wallet_balance < 0'
    );

    if (negativeBalances[0].count === 0) {
      logTest('Negative Balances', 'PASS', 'No negative balances found');
    } else {
      logTest('Negative Balances', 'FAIL', `${negativeBalances[0].count} users with negative balance`);
    }

  } catch (error) {
    logTest('Data Integrity', 'FAIL', `Error: ${error.message}`);
  }
}

async function runComprehensiveTests() {
  console.log('🚀 COMPREHENSIVE QA AUTOMATION TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  // Run all test phases
  const token = await testAuthentication();
  if (token) {
    await testDashboardAPI(token);
  }
  await testDatabaseSchema(connection);
  await testBusinessLogic(connection);
  await testDataIntegrity(connection);

  // Final report
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📝 Total Tests: ${testResults.tests.length}`);

  const passRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(2);
  console.log(`\n📈 Pass Rate: ${passRate}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
  }

  await connection.end();

  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('\n💾 Test results saved to test-results.json');
}

runComprehensiveTests().catch(console.error);
