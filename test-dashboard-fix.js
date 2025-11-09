/**
 * Test Dashboard Fix Script
 * This script will:
 * 1. Login to get a fresh token
 * 2. Test the dashboard endpoint
 * 3. Show what data should be displayed
 */

const API_URL = 'http://localhost:3001';

async function testDashboardFix() {
  console.log('🔧 Testing Dashboard Fix...\n');

  // Step 1: Login to get a fresh token
  console.log('1️⃣ Attempting login...');
  try {
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@finaster.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      const error = await loginResponse.text();
      console.error('Error:', error);

      // Try alternative login
      console.log('\n2️⃣ Trying alternative admin account...');
      const altLoginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@asterdex.com',
          password: 'admin123'
        })
      });

      if (!altLoginResponse.ok) {
        console.error('❌ Alternative login also failed');
        console.log('\n💡 Solution: You need to either:');
        console.log('   1. Create an admin user with known password');
        console.log('   2. Reset an existing admin password');
        console.log('   3. Login through the UI to get a fresh token');
        return;
      }

      const altData = await altLoginResponse.json();
      console.log('✅ Alternative login successful!');
      console.log('Token:', altData.token.substring(0, 50) + '...');

      // Test dashboard with this token
      await testDashboard(altData.token);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('User:', loginData.user.email);
    console.log('Token:', loginData.token.substring(0, 50) + '...');

    // Step 2: Test dashboard endpoint
    await testDashboard(loginData.token);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testDashboard(token) {
  console.log('\n3️⃣ Testing dashboard endpoint...');

  try {
    const dashboardResponse = await fetch(`${API_URL}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dashboardResponse.ok) {
      console.error('❌ Dashboard request failed:', dashboardResponse.status);
      const error = await dashboardResponse.text();
      console.error('Error:', error);
      return;
    }

    const dashboardData = await dashboardResponse.json();
    console.log('✅ Dashboard loaded successfully!\n');

    console.log('📊 Dashboard Data:');
    console.log('==================');
    console.log('User:', dashboardData.user.email);
    console.log('Wallet Balance: $' + dashboardData.user.wallet_balance);
    console.log('Total Investment: $' + dashboardData.user.total_investment);
    console.log('Total Earnings: $' + dashboardData.user.total_earnings);
    console.log('\nStatistics:');
    console.log('  Today Earnings: $' + dashboardData.statistics.today_earnings);
    console.log('  Week Earnings: $' + dashboardData.statistics.week_earnings);
    console.log('  Direct Referrals:', dashboardData.statistics.direct_referrals);
    console.log('  Total Team:', dashboardData.statistics.total_team);
    console.log('\nPackages:');
    console.log('  Active:', dashboardData.packages.active_count);
    console.log('  Expiring Soon:', dashboardData.packages.expiring_soon);
    console.log('\n✅ All data loaded correctly!');

    console.log('\n🔑 Your Fresh Token (save this):');
    console.log(token);

    console.log('\n💡 To fix the browser error:');
    console.log('   1. Open browser console (F12)');
    console.log('   2. Go to Application > Local Storage > http://localhost:5173');
    console.log('   3. Set key: auth_token');
    console.log('   4. Set value: ' + token);
    console.log('   5. Refresh the page');

  } catch (error) {
    console.error('❌ Dashboard error:', error.message);
  }
}

// Run the test
testDashboardFix();
