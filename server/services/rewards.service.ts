/**
 * Monthly Rewards Service
 * Handles 3-leg business volume calculation and monthly reward distribution
 * Reward criteria: 40:40:20 business volume ratio across 3 legs
 */

import { query } from '../db';
import { getMonthlyRewardsConfig } from './planSettings.service';

export interface Reward {
  id: number;
  milestone_name: string;
  required_volume: number;
  reward_amount: number;
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserBusinessVolume {
  user_id: string;
  leg1_volume: number;
  leg2_volume: number;
  leg3_volume: number;
  total_volume: number;
  qualified_volume: number;
  period_month: number;
  period_year: number;
  last_updated: Date;
}

export interface RewardDistribution {
  id: number;
  user_id: string;
  reward_id: number;
  reward_amount: number;
  business_volume: number;
  period_month: number;
  period_year: number;
  status: string;
  distributed_at: Date;
}

/**
 * Calculate 3-leg business volume for a user
 * Returns volumes for each leg and the qualified volume (40:40:20)
 */
export async function calculateUserBusinessVolume(
  userId: string,
  month?: number,
  year?: number
): Promise<UserBusinessVolume | null> {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Get user's direct referrals (first level only)
    const directsResult = await query(
      `SELECT id FROM users WHERE sponsor_id = ? AND is_active = TRUE`,
      [userId]
    );

    const directs = directsResult.rows || [];

    if (directs.length < 3) {
      // User doesn't have 3 legs, not qualified
      return {
        user_id: userId,
        leg1_volume: 0,
        leg2_volume: 0,
        leg3_volume: 0,
        total_volume: 0,
        qualified_volume: 0,
        period_month: targetMonth,
        period_year: targetYear,
        last_updated: now
      };
    }

    // Calculate business volume for each direct (leg)
    const legVolumes: number[] = [];

    for (const direct of directs) {
      const volume = await calculateLegVolume(direct.id, targetMonth, targetYear);
      legVolumes.push(volume);
    }

    // Sort volumes in descending order
    legVolumes.sort((a, b) => b - a);

    // Take top 3 legs
    const leg1 = legVolumes[0] || 0;
    const leg2 = legVolumes[1] || 0;
    const leg3 = legVolumes[2] || 0;
    const totalVolume = leg1 + leg2 + leg3;

    // Calculate qualified volume using 40:40:20 ratio
    // The qualified volume is limited by the smallest leg ratio
    const qualifiedVolume = calculateQualifiedVolume(leg1, leg2, leg3);

    return {
      user_id: userId,
      leg1_volume: leg1,
      leg2_volume: leg2,
      leg3_volume: leg3,
      total_volume: totalVolume,
      qualified_volume: qualifiedVolume,
      period_month: targetMonth,
      period_year: targetYear,
      last_updated: now
    };
  } catch (error) {
    console.error('❌ Calculate user business volume error:', error);
    throw error;
  }
}

/**
 * Calculate business volume for a specific leg (direct and all downline)
 */
async function calculateLegVolume(
  legRootUserId: string,
  month: number,
  year: number
): Promise<number> {
  try {
    // Get all users in this leg's downline
    const downlineIds = await getAllDownlineUsers(legRootUserId);
    downlineIds.push(legRootUserId); // Include the leg root itself

    if (downlineIds.length === 0) {
      return 0;
    }

    // Calculate total investment volume for this leg in the target month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const volumeResult = await query(
      `SELECT COALESCE(SUM(up.package_amount), 0) as total_volume
       FROM user_packages up
       WHERE up.user_id IN (${downlineIds.map(() => '?').join(',')})
       AND up.created_at >= ?
       AND up.created_at <= ?
       AND up.status = 'active'`,
      [...downlineIds, startDate, endDate]
    );

    return parseFloat(volumeResult.rows[0]?.total_volume || '0');
  } catch (error) {
    console.error('❌ Calculate leg volume error:', error);
    return 0;
  }
}

/**
 * Get all downline users recursively
 */
async function getAllDownlineUsers(userId: string, visited: Set<string> = new Set()): Promise<string[]> {
  if (visited.has(userId)) {
    return [];
  }

  visited.add(userId);

  const result = await query(
    `SELECT id FROM users WHERE sponsor_id = ? AND is_active = TRUE`,
    [userId]
  );

  const downline: string[] = [];

  for (const row of result.rows) {
    downline.push(row.id);
    const subDownline = await getAllDownlineUsers(row.id, visited);
    downline.push(...subDownline);
  }

  return downline;
}

/**
 * Calculate qualified volume based on 40:40:20 ratio
 */
function calculateQualifiedVolume(leg1: number, leg2: number, leg3: number): number {
  // The qualified volume is determined by maintaining the 40:40:20 ratio
  // Formula: qualified_volume = 2.5 * smallest_leg
  // Because: 0.4x + 0.4x + 0.2x = x, where x is qualified volume
  // And the smallest leg should be at least 20% of total

  const sortedLegs = [leg1, leg2, leg3].sort((a, b) => a - b);
  const smallestLeg = sortedLegs[0];
  const middleLeg = sortedLegs[1];
  const largestLeg = sortedLegs[2];

  // Check if the smallest leg is at least 20% of potential total
  const potentialTotal = smallestLeg * 5; // If smallest is 20%, total would be 5x

  // Check if middle and large legs can fulfill the 40:40 requirement
  const required40Percent = potentialTotal * 0.4;

  if (middleLeg >= required40Percent && largestLeg >= required40Percent) {
    return potentialTotal;
  }

  // If not, calculate based on what's available
  const maxFromMiddle = middleLeg / 0.4;
  const maxFromLargest = largestLeg / 0.4;

  return Math.min(potentialTotal, maxFromMiddle, maxFromLargest);
}

/**
 * Update or create user business volume record
 */
export async function updateUserBusinessVolume(
  userId: string,
  month?: number,
  year?: number
): Promise<void> {
  try {
    const volume = await calculateUserBusinessVolume(userId, month, year);

    if (!volume) {
      console.warn(`⚠️ Could not calculate business volume for user ${userId}`);
      return;
    }

    // Check if record exists
    const existingResult = await query(
      `SELECT id FROM user_business_volumes
       WHERE user_id = ? AND period_month = ? AND period_year = ?
       LIMIT 1`,
      [userId, volume.period_month, volume.period_year]
    );

    if (existingResult.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE user_business_volumes
         SET leg1_volume = ?, leg2_volume = ?, leg3_volume = ?,
             total_volume = ?, qualified_volume = ?, last_updated = NOW()
         WHERE user_id = ? AND period_month = ? AND period_year = ?`,
        [
          volume.leg1_volume,
          volume.leg2_volume,
          volume.leg3_volume,
          volume.total_volume,
          volume.qualified_volume,
          userId,
          volume.period_month,
          volume.period_year
        ]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO user_business_volumes
         (user_id, leg1_volume, leg2_volume, leg3_volume, total_volume, qualified_volume, period_month, period_year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          volume.leg1_volume,
          volume.leg2_volume,
          volume.leg3_volume,
          volume.total_volume,
          volume.qualified_volume,
          volume.period_month,
          volume.period_year
        ]
      );
    }

    console.log(`✅ Business volume updated for user ${userId}: ${volume.qualified_volume}`);
  } catch (error) {
    console.error('❌ Update user business volume error:', error);
    throw error;
  }
}

/**
 * Get user's business volume for current or specific month
 */
export async function getUserBusinessVolume(
  userId: string,
  month?: number,
  year?: number
): Promise<UserBusinessVolume | null> {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const result = await query(
      `SELECT * FROM user_business_volumes
       WHERE user_id = ? AND period_month = ? AND period_year = ?
       LIMIT 1`,
      [userId, targetMonth, targetYear]
    );

    if (result.rows.length === 0) {
      // Calculate and return fresh data
      return await calculateUserBusinessVolume(userId, targetMonth, targetYear);
    }

    return result.rows[0] as UserBusinessVolume;
  } catch (error) {
    console.error('❌ Get user business volume error:', error);
    return null;
  }
}

/**
 * Get all active rewards
 */
export async function getAllRewards(): Promise<Reward[]> {
  try {
    const result = await query(
      `SELECT * FROM rewards WHERE is_active = TRUE ORDER BY required_volume ASC`
    );

    return result.rows as Reward[];
  } catch (error) {
    console.error('❌ Get all rewards error:', error);
    return [];
  }
}

/**
 * Get specific reward by ID
 */
export async function getRewardById(rewardId: number): Promise<Reward | null> {
  try {
    const result = await query(
      `SELECT * FROM rewards WHERE id = ? LIMIT 1`,
      [rewardId]
    );

    return result.rows.length > 0 ? (result.rows[0] as Reward) : null;
  } catch (error) {
    console.error('❌ Get reward by ID error:', error);
    return null;
  }
}

/**
 * Create new reward (admin only)
 */
export async function createReward(
  milestoneName: string,
  requiredVolume: number,
  rewardAmount: number,
  description: string
): Promise<Reward> {
  try {
    const result = await query(
      `INSERT INTO rewards (milestone_name, required_volume, reward_amount, description, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [milestoneName, requiredVolume, rewardAmount, description]
    );

    const newReward = await getRewardById(result.insertId);

    if (!newReward) {
      throw new Error('Failed to retrieve created reward');
    }

    console.log(`✅ Reward created: ${milestoneName} - $${rewardAmount}`);
    return newReward;
  } catch (error) {
    console.error('❌ Create reward error:', error);
    throw error;
  }
}

/**
 * Update reward (admin only)
 */
export async function updateReward(
  rewardId: number,
  updates: Partial<Reward>
): Promise<void> {
  try {
    const fields = [];
    const values = [];

    if (updates.milestone_name !== undefined) {
      fields.push('milestone_name = ?');
      values.push(updates.milestone_name);
    }
    if (updates.required_volume !== undefined) {
      fields.push('required_volume = ?');
      values.push(updates.required_volume);
    }
    if (updates.reward_amount !== undefined) {
      fields.push('reward_amount = ?');
      values.push(updates.reward_amount);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(rewardId);

    await query(
      `UPDATE rewards SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    console.log(`✅ Reward ${rewardId} updated`);
  } catch (error) {
    console.error('❌ Update reward error:', error);
    throw error;
  }
}

/**
 * Delete reward (admin only)
 */
export async function deleteReward(rewardId: number): Promise<void> {
  try {
    await query('DELETE FROM rewards WHERE id = ?', [rewardId]);
    console.log(`✅ Reward ${rewardId} deleted`);
  } catch (error) {
    console.error('❌ Delete reward error:', error);
    throw error;
  }
}

/**
 * Check and distribute monthly rewards for a user
 */
export async function checkAndDistributeRewards(
  userId: string,
  month?: number,
  year?: number
): Promise<RewardDistribution[]> {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Check if monthly rewards plan is active
    const config = await getMonthlyRewardsConfig();
    if (!config || !config.is_active) {
      console.log('⚠️ Monthly rewards plan is not active');
      return [];
    }

    // Get user's business volume
    const volume = await getUserBusinessVolume(userId, targetMonth, targetYear);

    if (!volume || volume.qualified_volume === 0) {
      console.log(`⚠️ User ${userId} has no qualified business volume`);
      return [];
    }

    // Get all active rewards
    const rewards = await getAllRewards();

    const distributions: RewardDistribution[] = [];

    for (const reward of rewards) {
      // Check if user qualifies for this reward
      if (volume.qualified_volume >= reward.required_volume) {
        // Check if already distributed
        const existingResult = await query(
          `SELECT id FROM reward_distributions
           WHERE user_id = ? AND reward_id = ? AND period_month = ? AND period_year = ?
           LIMIT 1`,
          [userId, reward.id, targetMonth, targetYear]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⚠️ Reward ${reward.id} already distributed to user ${userId}`);
          continue;
        }

        // Distribute reward
        const distributionResult = await query(
          `INSERT INTO reward_distributions
           (user_id, reward_id, reward_amount, business_volume, period_month, period_year, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [userId, reward.id, reward.reward_amount, volume.qualified_volume, targetMonth, targetYear]
        );

        // Update user wallet balance
        await query(
          `UPDATE users SET wallet_balance = wallet_balance + ?, reward_earnings = reward_earnings + ?
           WHERE id = ?`,
          [reward.reward_amount, reward.reward_amount, userId]
        );

        // Record transaction
        await query(
          `INSERT INTO mlm_transactions
           (user_id, transaction_type, amount, status, description, metadata)
           VALUES (?, 'monthly_reward', ?, 'completed', ?, ?)`,
          [
            userId,
            reward.reward_amount,
            `Monthly Reward: ${reward.milestone_name}`,
            JSON.stringify({
              reward_id: reward.id,
              business_volume: volume.qualified_volume,
              period_month: targetMonth,
              period_year: targetYear
            })
          ]
        );

        // Mark distribution as completed
        await query(
          `UPDATE reward_distributions SET status = 'completed', distributed_at = NOW()
           WHERE id = ?`,
          [distributionResult.insertId]
        );

        distributions.push({
          id: distributionResult.insertId,
          user_id: userId,
          reward_id: reward.id,
          reward_amount: reward.reward_amount,
          business_volume: volume.qualified_volume,
          period_month: targetMonth,
          period_year: targetYear,
          status: 'completed',
          distributed_at: now
        });

        console.log(`✅ Reward distributed: ${reward.milestone_name} ($${reward.reward_amount}) to user ${userId}`);
      }
    }

    return distributions;
  } catch (error) {
    console.error('❌ Check and distribute rewards error:', error);
    throw error;
  }
}

/**
 * Get user's reward history
 */
export async function getUserRewardHistory(
  userId: string,
  limit: number = 50
): Promise<RewardDistribution[]> {
  try {
    const result = await query(
      `SELECT rd.*, r.milestone_name, r.description
       FROM reward_distributions rd
       JOIN rewards r ON rd.reward_id = r.id
       WHERE rd.user_id = ?
       ORDER BY rd.distributed_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return result.rows as RewardDistribution[];
  } catch (error) {
    console.error('❌ Get user reward history error:', error);
    return [];
  }
}

/**
 * Cron job: Calculate business volumes for all active users
 */
export async function calculateAllBusinessVolumes(): Promise<void> {
  try {
    console.log('🔄 Starting monthly business volume calculation...');

    const result = await query(
      `SELECT id FROM users WHERE is_active = TRUE`
    );

    let processed = 0;
    let failed = 0;

    for (const user of result.rows) {
      try {
        await updateUserBusinessVolume(user.id);
        processed++;
      } catch (error) {
        console.error(`❌ Failed to calculate volume for user ${user.id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Business volume calculation completed: ${processed} processed, ${failed} failed`);
  } catch (error) {
    console.error('❌ Calculate all business volumes error:', error);
    throw error;
  }
}

/**
 * Cron job: Distribute monthly rewards to all qualified users
 */
export async function distributeMonthlyRewards(): Promise<void> {
  try {
    console.log('🔄 Starting monthly rewards distribution...');

    const result = await query(
      `SELECT DISTINCT user_id FROM user_business_volumes
       WHERE qualified_volume > 0
       AND period_month = MONTH(CURDATE())
       AND period_year = YEAR(CURDATE())`
    );

    let distributed = 0;
    let failed = 0;

    for (const user of result.rows) {
      try {
        const distributions = await checkAndDistributeRewards(user.user_id);
        if (distributions.length > 0) {
          distributed++;
        }
      } catch (error) {
        console.error(`❌ Failed to distribute rewards for user ${user.user_id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Monthly rewards distribution completed: ${distributed} users rewarded, ${failed} failed`);
  } catch (error) {
    console.error('❌ Distribute monthly rewards error:', error);
    throw error;
  }
}
