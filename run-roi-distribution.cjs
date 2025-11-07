/**
 * Manual ROI Distribution Test Script
 * Run this to test the ROI distribution without waiting for cron
 */

const mysql = require('mysql2/promise');

async function distributeROI() {
  console.log('\n🔄 Starting ROI Distribution...');
  console.log('='.repeat(60));

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'finaster_mlm'
  });

  try {
    // Get all active user packages
    const [activePackages] = await connection.execute(
      `SELECT up.*, u.email
       FROM user_packages up
       JOIN users u ON up.user_id = u.id
       WHERE up.status = 'active' AND up.total_roi_earned < up.total_roi_limit
       ORDER BY up.created_at ASC`
    );

    if (activePackages.length === 0) {
      console.log('ℹ️  No active packages found for ROI distribution');
      return { success: true, distributed: 0, totalAmount: 0 };
    }

    console.log(`📦 Found ${activePackages.length} active packages\n`);

    let distributedCount = 0;
    let totalDistributed = 0;
    let completedPackages = 0;

    for (const pkg of activePackages) {
      const userId = pkg.user_id;
      const packageId = pkg.id;
      const dailyROI = parseFloat(pkg.daily_roi_amount);
      const totalROIEarned = parseFloat(pkg.total_roi_earned);
      const totalROILimit = parseFloat(pkg.total_roi_limit);
      const remainingROI = totalROILimit - totalROIEarned;

      // Check if package has expired
      const expiryDate = new Date(pkg.expiry_date);
      if (expiryDate < new Date()) {
        console.log(`⏰ Package ${packageId} expired, marking as completed`);
        await connection.execute(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        continue;
      }

      // Calculate ROI to distribute (don't exceed limit)
      let roiToDistribute = Math.min(dailyROI, remainingROI);

      if (roiToDistribute <= 0) {
        console.log(`✅ Package ${packageId} reached ROI limit, marking as completed`);
        await connection.execute(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        completedPackages++;
        continue;
      }

      // Update user package ROI earned
      await connection.execute(
        'UPDATE user_packages SET total_roi_earned = total_roi_earned + ? WHERE id = ?',
        [roiToDistribute, packageId]
      );

      // Update user wallet balance and earnings
      await connection.execute(
        `UPDATE users SET
         wallet_balance = wallet_balance + ?,
         total_earnings = total_earnings + ?,
         roi_earnings = roi_earnings + ?
         WHERE id = ?`,
        [roiToDistribute, roiToDistribute, roiToDistribute, userId]
      );

      // Create transaction record
      await connection.execute(
        `INSERT INTO mlm_transactions
         (user_id, transaction_type, amount, description, status, created_at, updated_at)
         VALUES (?, 'roi_distribution', ?, ?, 'completed', NOW(), NOW())`,
        [userId, roiToDistribute, `Daily ROI distribution - Package ${pkg.package_id}`]
      );

      distributedCount++;
      totalDistributed += roiToDistribute;

      console.log(`✅ Distributed $${roiToDistribute.toFixed(2)} to ${pkg.email} (Package ${packageId})`);

      // Mark package as completed if reached limit
      const newTotal = totalROIEarned + roiToDistribute;
      if (newTotal >= totalROILimit) {
        await connection.execute(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        completedPackages++;
        console.log(`   🎯 Package ${packageId} completed (reached 200% ROI limit)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ROI Distribution Summary:');
    console.log(`   ✅ Packages processed: ${distributedCount}`);
    console.log(`   💰 Total distributed: $${totalDistributed.toFixed(2)}`);
    console.log(`   🎯 Packages completed: ${completedPackages}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      distributed: distributedCount,
      totalAmount: totalDistributed,
      completed: completedPackages
    };

  } catch (error) {
    console.error('❌ ROI Distribution error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the distribution
distributeROI()
  .then((result) => {
    console.log('✅ ROI Distribution completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ROI Distribution failed:', error);
    process.exit(1);
  });
