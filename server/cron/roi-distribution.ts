/**
 * ROI Distribution Cron Job
 * Distributes daily ROI earnings to all active packages
 * Should run once per day at midnight
 */

import { query } from '../db';

export async function distributeROI() {
  console.log('\n🔄 Starting ROI Distribution...');
  console.log('='.repeat(60));

  try {
    // Get all active user packages
    const packagesResult = await query(
      `SELECT up.*, u.email
       FROM user_packages up
       JOIN users u ON up.user_id = u.id
       WHERE up.status = 'active' AND up.total_roi_earned < up.total_roi_limit
       ORDER BY up.created_at ASC`
    );

    const activePackages = packagesResult.rows;

    if (activePackages.length === 0) {
      console.log('ℹ️  No active packages found for ROI distribution');
      return { success: true, distributed: 0, totalAmount: 0 };
    }

    console.log(`📦 Found ${activePackages.length} active packages`);

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
        await query(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        continue;
      }

      // Calculate ROI to distribute (don't exceed limit)
      let roiToDistribute = Math.min(dailyROI, remainingROI);

      if (roiToDistribute <= 0) {
        console.log(`✅ Package ${packageId} reached ROI limit, marking as completed`);
        await query(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        completedPackages++;
        continue;
      }

      // Update user package ROI earned
      await query(
        'UPDATE user_packages SET total_roi_earned = total_roi_earned + ? WHERE id = ?',
        [roiToDistribute, packageId]
      );

      // Update user wallet balance and earnings
      await query(
        `UPDATE users SET
         wallet_balance = wallet_balance + ?,
         total_earnings = total_earnings + ?,
         roi_earnings = roi_earnings + ?
         WHERE id = ?`,
        [roiToDistribute, roiToDistribute, roiToDistribute, userId]
      );

      // Create transaction record
      await query(
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
        await query(
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
  }
}
