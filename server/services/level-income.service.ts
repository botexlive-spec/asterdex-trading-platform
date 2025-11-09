/**
 * 30-Level Income Distribution Service
 * Distributes level income commissions up to 30 levels with eligibility checks
 */

import { query } from '../db';

interface LevelIncomeConfig {
  max_levels: number;
  level_percentages: number[];
  require_level_unlock: boolean;
  require_active_status: boolean;
  min_package_amount: number;
  description: string;
}

interface DistributionResult {
  level: number;
  sponsor_id: string;
  commission_amount: number;
  skipped: boolean;
  skip_reason?: string;
}

/**
 * Get level income configuration from plan_settings
 */
async function getLevelIncomeConfig(): Promise<LevelIncomeConfig | null> {
  try {
    const result = await query(
      `SELECT payload FROM plan_settings
       WHERE feature_key = 'level_income_30' AND is_active = 1
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.error('❌ Level income configuration not found in plan_settings');
      return null;
    }

    return result.rows[0].payload as LevelIncomeConfig;
  } catch (error) {
    console.error('❌ Error fetching level income config:', error);
    return null;
  }
}

/**
 * Get user's direct referral count
 */
async function getDirectReferralCount(userId: string): Promise<number> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE sponsor_id = ?',
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`❌ Error getting direct referrals for ${userId}:`, error);
    return 0;
  }
}

/**
 * Check if user is eligible to receive commission at a specific level
 * Level unlock rule: N direct referrals = eligible for level N
 * Example: 1 direct = L1, 2 directs = L1-L2, 5 directs = L1-L5, etc.
 */
async function isEligibleForLevel(
  userId: string,
  level: number,
  config: LevelIncomeConfig
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    // Check if user exists and is active
    const userResult = await query(
      'SELECT id, status FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { eligible: false, reason: 'User not found' };
    }

    const user = userResult.rows[0];

    // Check active status if required
    if (config.require_active_status) {
      // Assuming 'active' status means they have at least one active package
      const activePackageResult = await query(
        `SELECT COUNT(*) as count FROM user_packages
         WHERE user_id = ? AND status = 'active'
         LIMIT 1`,
        [userId]
      );

      if (parseInt(activePackageResult.rows[0].count) === 0) {
        return { eligible: false, reason: 'No active package' };
      }
    }

    // Check level unlock requirement
    if (config.require_level_unlock) {
      const directCount = await getDirectReferralCount(userId);

      if (directCount < level) {
        return {
          eligible: false,
          reason: `Level ${level} requires ${level} directs, user has ${directCount}`
        };
      }
    }

    return { eligible: true };
  } catch (error) {
    console.error(`❌ Error checking eligibility for ${userId}:`, error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Distribute 30-level income commissions for a package purchase
 *
 * @param fromUserId - User who made the purchase
 * @param amount - Purchase amount
 * @param packageId - Package ID
 * @param userPackageId - User package ID (for idempotency reference)
 */
export async function distribute30LevelIncome(
  fromUserId: string,
  amount: number,
  packageId: string,
  userPackageId: string
): Promise<{ success: boolean; distributed: number; skipped: number; total_amount: number }> {
  const startTime = Date.now();
  console.log(`\\n💰 Starting 30-level income distribution for user ${fromUserId}, amount $${amount}`);

  try {
    // Get configuration
    const config = await getLevelIncomeConfig();
    if (!config) {
      console.error('❌ Level income config not available');
      return { success: false, distributed: 0, skipped: 0, total_amount: 0 };
    }

    // Get user's sponsor
    const userResult = await query(
      'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
      [fromUserId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].sponsor_id) {
      console.log('✅ No sponsor found, no level income to distribute');
      return { success: true, distributed: 0, skipped: 0, total_amount: 0 };
    }

    let currentSponsorId = userResult.rows[0].sponsor_id;
    let level = 1;
    let distributed = 0;
    let skipped = 0;
    let totalAmount = 0;

    const results: DistributionResult[] = [];

    // Traverse up the sponsor chain up to max_levels
    while (currentSponsorId && level <= config.max_levels) {
      const percentage = config.level_percentages[level - 1] || 0;

      if (percentage > 0) {
        const commissionAmount = (amount * percentage) / 100;

        // Check eligibility
        const eligibility = await isEligibleForLevel(currentSponsorId, level, config);

        if (eligibility.eligible) {
          try {
            // Credit commission to sponsor's wallet
            await query(
              `UPDATE users SET
               wallet_balance = wallet_balance + ?,
               total_earnings = total_earnings + ?,
               commission_earnings = commission_earnings + ?
               WHERE id = ?`,
              [commissionAmount, commissionAmount, commissionAmount, currentSponsorId]
            );

            // Record in payouts table with idempotency
            await query(
              `INSERT INTO payouts
               (user_id, from_user_id, payout_type, amount, level, description,
                reference_id, reference_type, status, created_at, updated_at)
               VALUES (?, ?, 'level_income', ?, ?, ?, ?, 'package_purchase', 'completed', NOW(), NOW())`,
              [
                currentSponsorId,
                fromUserId,
                commissionAmount,
                level,
                `Level ${level} income from package purchase`,
                userPackageId,
              ]
            );

            // Record in commissions table (legacy)
            await query(
              `INSERT INTO commissions
               (user_id, from_user_id, commission_type, amount, level, package_id, created_at)
               VALUES (?, ?, 'level_income', ?, ?, ?, NOW())`,
              [currentSponsorId, fromUserId, commissionAmount, level, packageId]
            );

            // Record transaction
            await query(
              `INSERT INTO mlm_transactions
               (user_id, transaction_type, amount, description, status, created_at, updated_at)
               VALUES (?, 'level_income', ?, ?, 'completed', NOW(), NOW())`,
              [currentSponsorId, commissionAmount, `Level ${level} commission from user ${fromUserId}`]
            );

            distributed++;
            totalAmount += commissionAmount;
            results.push({ level, sponsor_id: currentSponsorId, commission_amount: commissionAmount, skipped: false });

            console.log(`   ✅ L${level}: $${commissionAmount.toFixed(2)} → ${currentSponsorId}`);
          } catch (error: any) {
            // Check if it's a duplicate key error (idempotency)
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
              console.log(`   ⏭️  L${level}: Skipped (already paid) → ${currentSponsorId}`);
              skipped++;
            } else {
              console.error(`   ❌ L${level}: Error distributing to ${currentSponsorId}:`, error);
            }
            results.push({ level, sponsor_id: currentSponsorId, commission_amount: 0, skipped: true, skip_reason: 'Error' });
          }
        } else {
          console.log(`   ⏭️  L${level}: Skipped (${eligibility.reason}) → ${currentSponsorId}`);
          skipped++;
          results.push({
            level,
            sponsor_id: currentSponsorId,
            commission_amount: 0,
            skipped: true,
            skip_reason: eligibility.reason
          });
        }
      } else {
        console.log(`   ⏭️  L${level}: Skipped (0% commission)`);
        skipped++;
      }

      // Get next sponsor
      const sponsorResult = await query(
        'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
        [currentSponsorId]
      );

      if (sponsorResult.rows.length === 0 || !sponsorResult.rows[0].sponsor_id) {
        console.log(`   🛑 Reached top of sponsor chain at level ${level}`);
        break;
      }

      currentSponsorId = sponsorResult.rows[0].sponsor_id;
      level++;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\\n✅ 30-level income distribution completed:`);
    console.log(`   Distributed: ${distributed} levels`);
    console.log(`   Skipped: ${skipped} levels`);
    console.log(`   Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`   Duration: ${duration}s\\n`);

    return { success: true, distributed, skipped, total_amount: totalAmount };
  } catch (error) {
    console.error('❌ 30-level income distribution error:', error);
    return { success: false, distributed: 0, skipped: 0, total_amount: 0 };
  }
}

/**
 * Distribute ROI-on-ROI commissions up to 30 levels
 * Triggered when a user receives ROI
 *
 * @param userId - User who received ROI
 * @param roiAmount - ROI amount received
 * @param roiEventId - Reference ID for the ROI event (for idempotency)
 */
export async function distributeROIonROI30Levels(
  userId: string,
  roiAmount: number,
  roiEventId: string
): Promise<{ success: boolean; distributed: number; skipped: number; total_amount: number }> {
  const startTime = Date.now();
  console.log(`\\n💎 Starting ROI-on-ROI distribution for user ${userId}, ROI $${roiAmount}`);

  try {
    // Get configuration
    const config = await getLevelIncomeConfig();
    if (!config) {
      console.error('❌ Level income config not available');
      return { success: false, distributed: 0, skipped: 0, total_amount: 0 };
    }

    // Get user's sponsor
    const userResult = await query(
      'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].sponsor_id) {
      console.log('✅ No sponsor found, no ROI-on-ROI to distribute');
      return { success: true, distributed: 0, skipped: 0, total_amount: 0 };
    }

    let currentSponsorId = userResult.rows[0].sponsor_id;
    let level = 1;
    let distributed = 0;
    let skipped = 0;
    let totalAmount = 0;

    // For ROI-on-ROI, use same percentages as level income
    while (currentSponsorId && level <= config.max_levels) {
      const percentage = config.level_percentages[level - 1] || 0;

      if (percentage > 0) {
        const commissionAmount = (roiAmount * percentage) / 100;

        // Check eligibility
        const eligibility = await isEligibleForLevel(currentSponsorId, level, config);

        if (eligibility.eligible) {
          try {
            // Credit ROI-on-ROI to sponsor
            await query(
              `UPDATE users SET
               wallet_balance = wallet_balance + ?,
               total_earnings = total_earnings + ?
               WHERE id = ?`,
              [commissionAmount, commissionAmount, currentSponsorId]
            );

            // Record in payouts table with idempotency
            await query(
              `INSERT INTO payouts
               (user_id, from_user_id, payout_type, amount, level, description,
                reference_id, reference_type, status, created_at, updated_at)
               VALUES (?, ?, 'roi_on_roi', ?, ?, ?, ?, 'roi_distribution', 'completed', NOW(), NOW())`,
              [
                currentSponsorId,
                userId,
                commissionAmount,
                level,
                `Level ${level} ROI-on-ROI from user ${userId}`,
                roiEventId,
              ]
            );

            // Record transaction
            await query(
              `INSERT INTO mlm_transactions
               (user_id, transaction_type, amount, description, status, created_at, updated_at)
               VALUES (?, 'roi_on_roi', ?, ?, 'completed', NOW(), NOW())`,
              [currentSponsorId, commissionAmount, `L${level} ROI-on-ROI from ${userId}`]
            );

            distributed++;
            totalAmount += commissionAmount;
            console.log(`   ✅ L${level}: $${commissionAmount.toFixed(2)} → ${currentSponsorId}`);
          } catch (error: any) {
            // Check for duplicate (idempotency)
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
              console.log(`   ⏭️  L${level}: Skipped (already paid)`);
              skipped++;
            } else {
              console.error(`   ❌ L${level}: Error:`, error);
            }
          }
        } else {
          console.log(`   ⏭️  L${level}: Skipped (${eligibility.reason})`);
          skipped++;
        }
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\\n✅ ROI-on-ROI distribution completed: ${distributed} levels, $${totalAmount.toFixed(2)}, ${duration}s\\n`);

    return { success: true, distributed, skipped, total_amount: totalAmount };
  } catch (error) {
    console.error('❌ ROI-on-ROI distribution error:', error);
    return { success: false, distributed: 0, skipped: 0, total_amount: 0 };
  }
}
