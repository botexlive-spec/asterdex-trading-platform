/**
 * Booster Income Service
 * Manages 30-day booster countdown and direct referral tracking
 */

import { query } from '../db';
import { getBoosterIncomeConfig, isPlanActive } from './planSettings.service';

export interface Booster {
  id: string;
  user_id: string;
  start_date: Date;
  end_date: Date;
  direct_count: number;
  target_directs: number;
  bonus_roi_percentage: number;
  status: 'active' | 'achieved' | 'expired';
  days_remaining?: number;
}

/**
 * Initialize booster for user on first investment
 */
export async function initializeBooster(userId: string): Promise<void> {
  try {
    // Check if booster plan is active
    const boosterActive = await isPlanActive('booster_income');
    if (!boosterActive) {
      console.log('Booster income plan is inactive');
      return;
    }

    // Check if user already has an active booster
    const existingBooster = await query(
      `SELECT * FROM boosters WHERE user_id = ? AND status IN ('active', 'achieved') LIMIT 1`,
      [userId]
    );

    if (existingBooster.rows.length > 0) {
      console.log('User already has an active booster');
      return;
    }

    // Get booster configuration
    const config = await getBoosterIncomeConfig();
    if (!config) {
      console.log('Booster configuration not found');
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.countdown_days);

    // Create booster record
    await query(
      `INSERT INTO boosters (
        user_id, start_date, end_date, direct_count, target_directs,
        bonus_roi_percentage, status
      ) VALUES (?, ?, ?, 0, ?, ?, 'active')`,
      [
        userId,
        startDate,
        endDate,
        config.required_directs,
        config.bonus_roi_percentage
      ]
    );

    // Update first_investment_date in users table
    await query(
      'UPDATE users SET first_investment_date = ? WHERE id = ? AND first_investment_date IS NULL',
      [startDate, userId]
    );

    console.log(`✅ Booster initialized for user ${userId} (${config.countdown_days} days)`);
  } catch (error) {
    console.error('Error initializing booster:', error);
    throw error;
  }
}

/**
 * Update booster direct count when new referral is added or makes investment
 * Counts only directs WITH active investments (user_packages)
 */
export async function updateBoosterDirectCount(sponsorId: string): Promise<void> {
  try {
    // Get active booster
    const boosterResult = await query(
      `SELECT b.*,
       (SELECT COUNT(DISTINCT u.id)
        FROM users u
        INNER JOIN user_packages up ON u.id = up.user_id
        WHERE u.sponsor_id = ?
        AND u.is_active = TRUE
        AND up.status = 'active'
       ) as current_directs
       FROM boosters b
       WHERE b.user_id = ? AND b.status = 'active'
       LIMIT 1`,
      [sponsorId, sponsorId]
    );

    if (boosterResult.rows.length === 0) {
      return;
    }

    const booster = boosterResult.rows[0];
    const currentDirects = parseInt(booster.current_directs);

    console.log(`📊 Booster check for ${sponsorId}: ${currentDirects}/${booster.target_directs} directs with active investments`);

    // Update booster direct count
    await query(
      'UPDATE boosters SET direct_count = ?, updated_at = NOW() WHERE id = ?',
      [currentDirects, booster.id]
    );

    // Check if target achieved
    if (currentDirects >= booster.target_directs && booster.status === 'active') {
      await query(
        `UPDATE boosters SET status = 'achieved', updated_at = NOW() WHERE id = ?`,
        [booster.id]
      );

      console.log(`🎉 Booster achieved for user ${sponsorId}: ${currentDirects}/${booster.target_directs} directs!`);

      // Update user_packages to apply booster
      await query(
        `UPDATE user_packages
         SET has_booster = TRUE,
             booster_roi_percentage = ?,
             updated_at = NOW()
         WHERE user_id = ? AND status = 'active'`,
        [booster.bonus_roi_percentage, sponsorId]
      );
    }
  } catch (error) {
    console.error('Error updating booster direct count:', error);
    throw error;
  }
}

/**
 * Get booster status for user
 * Counts only directs WITH active investments
 */
export async function getBoosterStatus(userId: string): Promise<Booster | null> {
  try {
    const result = await query(
      `SELECT b.*,
       (SELECT COUNT(DISTINCT u.id)
        FROM users u
        INNER JOIN user_packages up ON u.id = up.user_id
        WHERE u.sponsor_id = ?
        AND u.is_active = TRUE
        AND up.status = 'active'
       ) as current_directs,
       DATEDIFF(b.end_date, NOW()) as days_remaining
       FROM boosters b
       WHERE b.user_id = ? AND b.status IN ('active', 'achieved')
       ORDER BY b.created_at DESC
       LIMIT 1`,
      [userId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      user_id: row.user_id,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      direct_count: parseInt(row.current_directs),
      target_directs: row.target_directs,
      bonus_roi_percentage: parseFloat(row.bonus_roi_percentage),
      status: row.status,
      days_remaining: Math.max(0, row.days_remaining || 0)
    };
  } catch (error) {
    console.error('Error getting booster status:', error);
    return null;
  }
}

/**
 * Check and expire boosters
 * Should be run daily via cron
 */
export async function expireBoostersDaily(): Promise<number> {
  try {
    const result = await query(
      `UPDATE boosters
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active'
       AND end_date < NOW()`
    );

    const expiredCount = result.affectedRows || 0;

    if (expiredCount > 0) {
      console.log(`⏰ Expired ${expiredCount} boosters`);

      // Remove booster from active packages
      await query(
        `UPDATE user_packages up
         INNER JOIN boosters b ON up.user_id = b.user_id
         SET up.has_booster = FALSE,
             up.booster_roi_percentage = 0,
             up.updated_at = NOW()
         WHERE b.status = 'expired'
         AND up.status = 'active'
         AND up.has_booster = TRUE`
      );
    }

    return expiredCount;
  } catch (error) {
    console.error('Error expiring boosters:', error);
    return 0;
  }
}

/**
 * Get all active boosters (for admin)
 */
export async function getAllActiveBoosters(): Promise<Booster[]> {
  try {
    const result = await query(
      `SELECT b.*,
       u.email, u.full_name,
       (SELECT COUNT(*) FROM users WHERE sponsor_id = b.user_id AND is_active = TRUE) as current_directs,
       DATEDIFF(b.end_date, NOW()) as days_remaining
       FROM boosters b
       JOIN users u ON b.user_id = u.id
       WHERE b.status IN ('active', 'achieved')
       ORDER BY b.end_date ASC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      direct_count: parseInt(row.current_directs),
      target_directs: row.target_directs,
      bonus_roi_percentage: parseFloat(row.bonus_roi_percentage),
      status: row.status,
      days_remaining: Math.max(0, row.days_remaining || 0)
    }));
  } catch (error) {
    console.error('Error getting all active boosters:', error);
    return [];
  }
}
