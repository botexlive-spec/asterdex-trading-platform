/**
 * Enhanced ROI Distribution Cron Job
 * Distributes:
 * 1. Daily ROI to package owners
 * 2. Booster ROI (extra 0.1%) if qualified
 * 3. ROI-on-ROI to upline sponsors (level-based)
 * Should run once per day at midnight
 */

import { query } from '../db';
import {
  isPlanActive,
  getGenerationPlanConfig,
  getBoosterIncomeConfig
} from '../services/planSettings.service';
import * as fs from 'fs';
import * as path from 'path';

// File logging utilities
const LOG_DIR = path.join(process.cwd(), 'logs');
const ROI_ON_ROI_LOG_FILE = path.join(LOG_DIR, 'roi-on-roi.log');

function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logToFile(message: string, logFile: string = ROI_ON_ROI_LOG_FILE) {
  ensureLogDirectory();
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
}

function logROIonROI(message: string) {
  console.log(message);
  logToFile(message);
}

export async function distributeEnhancedROI() {
  console.log('\n🔄 Starting Enhanced ROI Distribution...');
  console.log('='.repeat(60));

  try {
    // Check if investment plan is active
    const investmentActive = await isPlanActive('investment_plan');
    if (!investmentActive) {
      console.log('ℹ️  Investment plan is inactive, skipping ROI distribution');
      return { success: true, distributed: 0, totalAmount: 0 };
    }

    // Get all active user packages
    const packagesResult = await query(
      `SELECT up.*, u.email, u.id as user_id, u.first_investment_date
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
    let boosterBonuses = 0;
    let roiOnROIDistributed = 0;

    // Get booster config
    const boosterConfig = await getBoosterIncomeConfig();

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

      // Calculate base ROI to distribute (don't exceed limit)
      let baseROI = Math.min(dailyROI, remainingROI);
      if (baseROI <= 0) {
        console.log(`✅ Package ${packageId} reached ROI limit, marking as completed`);
        await query(
          'UPDATE user_packages SET status = ? WHERE id = ?',
          ['completed', packageId]
        );
        completedPackages++;
        continue;
      }

      // Check for booster ROI
      let boosterROI = 0;
      const boosterActive = await query(
        `SELECT * FROM boosters WHERE user_id = ? AND status = 'active' LIMIT 1`,
        [userId]
      );

      if (boosterActive.rows.length > 0) {
        const booster = boosterActive.rows[0];
        const endDate = new Date(booster.end_date);
        const now = new Date();

        // Check if booster is still valid
        if (now <= endDate) {
          // Check if user achieved target directs
          if (booster.direct_count >= booster.target_directs) {
            const bonusPercentage = parseFloat(booster.bonus_roi_percentage);
            boosterROI = baseROI * (bonusPercentage / 100);
            console.log(`🚀 Booster active for ${pkg.email}: +${bonusPercentage}% = $${boosterROI.toFixed(2)}`);
            boosterBonuses++;
          }
        } else {
          // Booster expired
          await query(
            'UPDATE boosters SET status = ? WHERE id = ?',
            ['expired', booster.id]
          );
          console.log(`⏰ Booster expired for ${pkg.email}`);
        }
      }

      const totalROI = baseROI + boosterROI;

      // Update user package ROI earned
      await query(
        'UPDATE user_packages SET total_roi_earned = total_roi_earned + ? WHERE id = ?',
        [totalROI, packageId]
      );

      // Update user wallet balance and earnings
      await query(
        `UPDATE users SET
         wallet_balance = wallet_balance + ?,
         total_earnings = total_earnings + ?,
         roi_earnings = roi_earnings + ?,
         booster_earnings = booster_earnings + ?
         WHERE id = ?`,
        [totalROI, totalROI, baseROI, boosterROI, userId]
      );

      // Create transaction record for base ROI
      await query(
        `INSERT INTO mlm_transactions
         (user_id, transaction_type, amount, description, status, created_at, updated_at)
         VALUES (?, 'roi_distribution', ?, ?, 'completed', NOW(), NOW())`,
        [userId, baseROI, `Daily ROI distribution - Package ${pkg.package_id}`]
      );

      // Create transaction record for booster ROI if applicable
      if (boosterROI > 0) {
        await query(
          `INSERT INTO mlm_transactions
           (user_id, transaction_type, amount, description, status, created_at, updated_at)
           VALUES (?, 'booster_roi', ?, ?, 'completed', NOW(), NOW())`,
          [userId, boosterROI, `Booster ROI bonus - Package ${pkg.package_id}`]
        );
      }

      distributedCount++;
      totalDistributed += totalROI;

      console.log(`✅ Distributed $${totalROI.toFixed(2)} to ${pkg.email} (Base: $${baseROI.toFixed(2)}, Booster: $${boosterROI.toFixed(2)})`);

      // NOW: Distribute ROI-on-ROI to upline sponsors
      const roiOnROIAmount = await distributeROIonROI(userId, totalROI);
      roiOnROIDistributed += roiOnROIAmount;

      // Mark package as completed if reached limit
      const newTotal = totalROIEarned + totalROI;
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
    console.log('📊 Enhanced ROI Distribution Summary:');
    console.log(`   ✅ Packages processed: ${distributedCount}`);
    console.log(`   💰 Total ROI distributed: $${totalDistributed.toFixed(2)}`);
    console.log(`   🚀 Booster bonuses: ${boosterBonuses}`);
    console.log(`   📈 ROI-on-ROI distributed: $${roiOnROIDistributed.toFixed(2)}`);
    console.log(`   🎯 Packages completed: ${completedPackages}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      distributed: distributedCount,
      totalAmount: totalDistributed,
      completed: completedPackages,
      boosterBonuses,
      roiOnROIDistributed
    };

  } catch (error) {
    console.error('❌ Enhanced ROI Distribution error:', error);
    throw error;
  }
}

/**
 * Distribute ROI-on-ROI to upline sponsors based on unlocked levels
 * This distributes a percentage of the ROI earned (not the investment)
 */
async function distributeROIonROI(userId: string, roiAmount: number): Promise<number> {
  try {
    logROIonROI(`\n🔄 Starting ROI-on-ROI distribution for user ${userId}, base ROI: $${roiAmount.toFixed(2)}`);

    // Check if generation plan is active
    const generationActive = await isPlanActive('generation_plan');
    if (!generationActive) {
      logROIonROI(`   ⚠️  Generation plan is inactive, skipping ROI-on-ROI`);
      return 0;
    }

    // Get generation plan configuration
    const config = await getGenerationPlanConfig();
    if (!config || config.distribution_type !== 'roi_on_roi') {
      logROIonROI(`   ⚠️  ROI-on-ROI not configured or inactive`);
      return 0;
    }

    const levelPercentages = config.level_percentages; // [12, 10, 8, 5, 4, 4, 3, 3, 2, 2, 3, 3, 4, 4, 8]
    logROIonROI(`   📊 Level percentages: ${levelPercentages.join(', ')}%`);

    // Get user's sponsor
    const userResult = await query(
      'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].sponsor_id) {
      return 0;
    }

    let currentSponsorId = userResult.rows[0].sponsor_id;
    let level = 1;
    let totalROIonROI = 0;

    // Traverse up the sponsor chain
    while (currentSponsorId && level <= levelPercentages.length) {
      // Check if sponsor has this level unlocked
      const levelUnlockResult = await query(
        `SELECT unlocked_levels FROM level_unlocks WHERE user_id = ? LIMIT 1`,
        [currentSponsorId]
      );

      if (levelUnlockResult.rows.length === 0) {
        // No level unlocks record, skip this sponsor
        logROIonROI(`   ⚠️  Sponsor ${currentSponsorId} has no level unlocks, skipping level ${level}`);

        // Get next sponsor
        const nextSponsorResult = await query(
          'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
          [currentSponsorId]
        );

        if (nextSponsorResult.rows.length === 0 || !nextSponsorResult.rows[0].sponsor_id) {
          break;
        }

        currentSponsorId = nextSponsorResult.rows[0].sponsor_id;
        level++;
        continue;
      }

      const unlockedLevels = levelUnlockResult.rows[0].unlocked_levels;

      // Check if this level is unlocked
      if (level > unlockedLevels) {
        logROIonROI(`   🔒 Level ${level} not unlocked for sponsor ${currentSponsorId} (has ${unlockedLevels} unlocked)`);

        // Get next sponsor
        const nextSponsorResult = await query(
          'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
          [currentSponsorId]
        );

        if (nextSponsorResult.rows.length === 0 || !nextSponsorResult.rows[0].sponsor_id) {
          break;
        }

        currentSponsorId = nextSponsorResult.rows[0].sponsor_id;
        level++;
        continue;
      }

      const percentage = levelPercentages[level - 1];

      if (percentage > 0) {
        const commissionAmount = (roiAmount * percentage) / 100;

        // Credit commission to sponsor (update wallet in real-time)
        await query(
          `UPDATE users SET
           wallet_balance = wallet_balance + ?,
           total_earnings = total_earnings + ?,
           roi_on_roi_earnings = roi_on_roi_earnings + ?
           WHERE id = ?`,
          [commissionAmount, commissionAmount, commissionAmount, currentSponsorId]
        );

        // Record in payouts table (primary payout record)
        await query(
          `INSERT INTO payouts
           (user_id, from_user_id, payout_type, amount, level, description, status)
           VALUES (?, ?, 'roi_on_roi', ?, ?, ?, 'completed')`,
          [currentSponsorId, userId, commissionAmount, level, `Level ${level} ROI-on-ROI commission from user ${userId}`]
        );

        // Record commission (for reporting)
        await query(
          `INSERT INTO commissions
           (user_id, from_user_id, commission_type, amount, level, created_at)
           VALUES (?, ?, 'roi_on_roi', ?, ?, NOW())`,
          [currentSponsorId, userId, commissionAmount, level]
        );

        // Record transaction (for audit trail)
        await query(
          `INSERT INTO mlm_transactions
           (user_id, transaction_type, amount, description, status, created_at, updated_at)
           VALUES (?, 'roi_on_roi', ?, ?, 'completed', NOW(), NOW())`,
          [currentSponsorId, commissionAmount, `Level ${level} ROI-on-ROI commission`]
        );

        totalROIonROI += commissionAmount;
        logROIonROI(`   📈 Level ${level} ROI-on-ROI: $${commissionAmount.toFixed(2)} (${percentage}%) to sponsor ${currentSponsorId} from user ${userId}`);
      }

      // Get next sponsor
      const sponsorResult = await query(
        'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
        [currentSponsorId]
      );

      if (sponsorResult.rows.length === 0 || !sponsorResult.rows[0].sponsor_id) {
        break;
      }

      currentSponsorId = sponsorResult.rows[0].sponsor_id;
      level++;
    }

    logROIonROI(`✅ ROI-on-ROI distribution completed for user ${userId}: Total distributed $${totalROIonROI.toFixed(2)} across ${level - 1} levels\n`);

    return totalROIonROI;

  } catch (error) {
    const errorMsg = `❌ ROI-on-ROI distribution error for user ${userId}: ${error}`;
    console.error(errorMsg);
    logToFile(errorMsg);
    return 0;
  }
}
