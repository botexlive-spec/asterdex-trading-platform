/**
 * Admin Rank Rewards Routes - MySQL Backend
 * Handles rank reward management and distribution
 */

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware: Authenticate admin users
function authenticateAdmin(req: Request, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role?: string };

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).user = decoded;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Apply admin authentication to all routes
router.use(authenticateAdmin);

/**
 * GET /api/ranks - Get all rank rewards
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM rank_rewards ORDER BY rank_order ASC`
    );

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching rank rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rank rewards' });
  }
});

/**
 * POST /api/ranks - Create new rank reward
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      rank_name,
      reward_amount,
      rank_order,
      min_direct_referrals,
      min_team_volume,
      min_active_directs,
      min_personal_sales,
      terms_conditions,
      is_active,
      reward_type,
      bonus_percentage
    } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO rank_rewards (
        rank_name, reward_amount, rank_order, min_direct_referrals,
        min_team_volume, min_active_directs, min_personal_sales,
        terms_conditions, is_active, reward_type, bonus_percentage,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        rank_name, reward_amount, rank_order, min_direct_referrals,
        min_team_volume, min_active_directs, min_personal_sales,
        terms_conditions, is_active, reward_type, bonus_percentage
      ]
    );

    // Fetch the created rank
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rank_rewards WHERE id = ?',
      [result.insertId]
    );

    res.json({ data: rows[0] });
  } catch (error: any) {
    console.error('Error creating rank reward:', error);
    res.status(500).json({ error: 'Failed to create rank reward' });
  }
});

/**
 * PUT /api/ranks/:id - Update rank reward
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await pool.query(
      `UPDATE rank_rewards SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );

    res.json({ message: 'Rank reward updated successfully' });
  } catch (error: any) {
    console.error('Error updating rank reward:', error);
    res.status(500).json({ error: 'Failed to update rank reward' });
  }
});

/**
 * DELETE /api/ranks/:id - Delete rank reward
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM rank_rewards WHERE id = ?', [id]);

    res.json({ message: 'Rank reward deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting rank reward:', error);
    res.status(500).json({ error: 'Failed to delete rank reward' });
  }
});

/**
 * GET /api/ranks/distributions - Get rank distribution history
 */
router.get('/distributions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        rdh.*,
        u.email as user_email,
        u.raw_user_meta_data as user_meta,
        d.email as distributor_email,
        d.raw_user_meta_data as distributor_meta
      FROM rank_distribution_history rdh
      LEFT JOIN users u ON rdh.user_id = u.id
      LEFT JOIN users d ON rdh.distributed_by = d.id
      ORDER BY rdh.created_at DESC
      LIMIT ?`,
      [limit]
    );

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching rank distribution history:', error);
    res.status(500).json({ error: 'Failed to fetch rank distribution history' });
  }
});

/**
 * POST /api/ranks/distribute - Distribute rank reward to user
 */
router.post('/distribute', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const { userId, rankName, rewardAmount, distributionType, notes } = req.body;
    const adminId = (req as any).user.id;

    await connection.beginTransaction();

    // Create distribution record
    await connection.query(
      `INSERT INTO rank_distribution_history (
        user_id, rank_name, reward_amount, distributed_by,
        distribution_type, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, rankName, rewardAmount, adminId, distributionType, notes || '']
    );

    // Update user's wallet
    const [wallets] = await connection.query<RowDataPacket[]>(
      'SELECT available_balance, total_balance FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (wallets.length > 0) {
      const wallet = wallets[0];
      await connection.query(
        `UPDATE wallets SET
          available_balance = ?,
          total_balance = ?,
          updated_at = NOW()
        WHERE user_id = ?`,
        [
          wallet.available_balance + rewardAmount,
          wallet.total_balance + rewardAmount,
          userId
        ]
      );
    }

    // Create transaction record
    await connection.query(
      `INSERT INTO mlm_transactions (
        user_id, transaction_type, amount, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        'rank_reward',
        rewardAmount,
        `${rankName} rank achievement reward`,
        'completed'
      ]
    );

    await connection.commit();
    res.json({ message: 'Rank reward distributed successfully' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error distributing rank reward:', error);
    res.status(500).json({ error: 'Failed to distribute rank reward' });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/ranks/qualification/:userId/:rankId - Check user rank qualification
 */
router.get('/qualification/:userId/:rankId', async (req: Request, res: Response) => {
  try {
    const { userId, rankId } = req.params;

    // Get rank requirements
    const [ranks] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rank_rewards WHERE id = ?',
      [rankId]
    );

    if (ranks.length === 0) {
      return res.status(404).json({ error: 'Rank not found' });
    }

    const rank = ranks[0];
    const missingRequirements: string[] = [];

    // Get user's referral statistics
    const [referrals] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE referred_by = ?',
      [userId]
    );

    const directReferrals = referrals.length;
    const referralIds = referrals.map(r => r.id);

    // Count active directs (users with active packages)
    let activeDirects = 0;
    if (referralIds.length > 0) {
      const [activePackages] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT user_id FROM user_packages
         WHERE user_id IN (?) AND status = 'active'`,
        [referralIds]
      );
      activeDirects = activePackages.length;
    }

    // Calculate team volume
    let teamVolume = 0;
    if (referralIds.length > 0) {
      const [teamPurchases] = await pool.query<RowDataPacket[]>(
        'SELECT price FROM user_packages WHERE user_id IN (?)',
        [referralIds]
      );
      teamVolume = teamPurchases.reduce((sum, p) => sum + (p.price || 0), 0);
    }

    // Calculate personal sales
    const [personalPurchases] = await pool.query<RowDataPacket[]>(
      'SELECT price FROM user_packages WHERE user_id = ?',
      [userId]
    );
    const personalSales = personalPurchases.reduce((sum, p) => sum + (p.price || 0), 0);

    // Check requirements
    if (directReferrals < rank.min_direct_referrals) {
      missingRequirements.push(
        `Need ${rank.min_direct_referrals - directReferrals} more direct referrals`
      );
    }

    if (activeDirects < rank.min_active_directs) {
      missingRequirements.push(
        `Need ${rank.min_active_directs - activeDirects} more active direct referrals`
      );
    }

    if (teamVolume < rank.min_team_volume) {
      missingRequirements.push(
        `Need $${(rank.min_team_volume - teamVolume).toFixed(2)} more team volume`
      );
    }

    if (personalSales < rank.min_personal_sales) {
      missingRequirements.push(
        `Need $${(rank.min_personal_sales - personalSales).toFixed(2)} more personal sales`
      );
    }

    res.json({
      qualified: missingRequirements.length === 0,
      missingRequirements
    });
  } catch (error: any) {
    console.error('Error checking rank qualification:', error);
    res.status(500).json({ error: 'Failed to check rank qualification' });
  }
});

/**
 * GET /api/ranks/achievements - Get all rank achievements
 * GET /api/ranks/achievements/:userId - Get specific user's rank achievements
 */
router.get('/achievements/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    let query = `
      SELECT
        rdh.*,
        u.email as user_email,
        u.raw_user_meta_data as user_meta
      FROM rank_distribution_history rdh
      LEFT JOIN users u ON rdh.user_id = u.id
    `;

    const params: any[] = [];

    if (userId) {
      query += ' WHERE rdh.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY rdh.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching rank achievements:', error);
    res.status(500).json({ error: 'Failed to fetch rank achievements' });
  }
});

/**
 * GET /api/ranks/stats - Get rank statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get all distribution history
    const [distributions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rank_distribution_history ORDER BY created_at DESC'
    );

    const totalAchievements = distributions.length;
    const totalRewardsDistributed = distributions.reduce(
      (sum, d) => sum + parseFloat(d.reward_amount),
      0
    );

    // Count achievements by rank
    const achievementsByRank: Record<string, number> = {};
    distributions.forEach(d => {
      achievementsByRank[d.rank_name] = (achievementsByRank[d.rank_name] || 0) + 1;
    });

    // Get recent achievements (top 10)
    const recentAchievements = distributions.slice(0, 10);

    res.json({
      totalAchievements,
      totalRewardsDistributed,
      achievementsByRank,
      recentAchievements
    });
  } catch (error: any) {
    console.error('Error fetching rank stats:', error);
    res.status(500).json({ error: 'Failed to fetch rank stats' });
  }
});

/**
 * GET /api/ranks/eligibility/:userId - Calculate rank eligibility for user
 */
router.get('/eligibility/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get all ranks
    const [ranks] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rank_rewards ORDER BY rank_order ASC'
    );

    // Get user's current achievements
    const [achievements] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM rank_distribution_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const currentRank = achievements.length > 0 ? achievements[0].rank_name : null;

    // Get user referral data once
    const [referrals] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE referred_by = ?',
      [userId]
    );

    const directReferrals = referrals.length;
    const referralIds = referrals.map(r => r.id);

    // Get active directs
    let activeDirects = 0;
    if (referralIds.length > 0) {
      const [activePackages] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT user_id FROM user_packages
         WHERE user_id IN (?) AND status = 'active'`,
        [referralIds]
      );
      activeDirects = activePackages.length;
    }

    // Calculate team volume
    let teamVolume = 0;
    if (referralIds.length > 0) {
      const [teamPurchases] = await pool.query<RowDataPacket[]>(
        'SELECT price FROM user_packages WHERE user_id IN (?)',
        [referralIds]
      );
      teamVolume = teamPurchases.reduce((sum, p) => sum + (p.price || 0), 0);
    }

    // Calculate personal sales
    const [personalPurchases] = await pool.query<RowDataPacket[]>(
      'SELECT price FROM user_packages WHERE user_id = ?',
      [userId]
    );
    const personalSales = personalPurchases.reduce((sum, p) => sum + (p.price || 0), 0);

    // Check eligibility for each rank
    const eligibleRanks = ranks.map((rank: any) => {
      const missingRequirements: string[] = [];

      if (directReferrals < rank.min_direct_referrals) {
        missingRequirements.push(
          `Need ${rank.min_direct_referrals - directReferrals} more direct referrals`
        );
      }

      if (activeDirects < rank.min_active_directs) {
        missingRequirements.push(
          `Need ${rank.min_active_directs - activeDirects} more active direct referrals`
        );
      }

      if (teamVolume < rank.min_team_volume) {
        missingRequirements.push(
          `Need $${(rank.min_team_volume - teamVolume).toFixed(2)} more team volume`
        );
      }

      if (personalSales < rank.min_personal_sales) {
        missingRequirements.push(
          `Need $${(rank.min_personal_sales - personalSales).toFixed(2)} more personal sales`
        );
      }

      // Calculate progress percentage
      const referralProgress = Math.min((directReferrals / rank.min_direct_referrals) * 100, 100);
      const activeProgress = Math.min((activeDirects / rank.min_active_directs) * 100, 100);
      const volumeProgress = Math.min((teamVolume / rank.min_team_volume) * 100, 100);
      const salesProgress = Math.min((personalSales / rank.min_personal_sales) * 100, 100);

      const progress = Math.round((referralProgress + activeProgress + volumeProgress + salesProgress) / 4);

      return {
        rank,
        qualified: missingRequirements.length === 0,
        progress,
        missingRequirements
      };
    });

    res.json({
      currentRank,
      eligibleRanks
    });
  } catch (error: any) {
    console.error('Error calculating rank eligibility:', error);
    res.status(500).json({ error: 'Failed to calculate rank eligibility' });
  }
});

/**
 * POST /api/ranks/user/:userId - Update user's rank (manual assignment)
 */
router.post('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { rankId, reason } = req.body;

    // Get rank details
    const [ranks] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM rank_rewards WHERE id = ?',
      [rankId]
    );

    if (ranks.length === 0) {
      return res.status(404).json({ error: 'Rank not found' });
    }

    const rank = ranks[0];
    const adminId = (req as any).user.id;

    // Distribute the rank reward
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Create distribution record
      await connection.query(
        `INSERT INTO rank_distribution_history (
          user_id, rank_name, reward_amount, distributed_by,
          distribution_type, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userId, rank.rank_name, rank.reward_amount, adminId, 'manual', reason || 'Manual adjustment']
      );

      // Update user's wallet
      const [wallets] = await connection.query<RowDataPacket[]>(
        'SELECT available_balance, total_balance FROM wallets WHERE user_id = ?',
        [userId]
      );

      if (wallets.length > 0) {
        const wallet = wallets[0];
        await connection.query(
          `UPDATE wallets SET
            available_balance = ?,
            total_balance = ?,
            updated_at = NOW()
          WHERE user_id = ?`,
          [
            wallet.available_balance + rank.reward_amount,
            wallet.total_balance + rank.reward_amount,
            userId
          ]
        );
      }

      // Create transaction record
      await connection.query(
        `INSERT INTO mlm_transactions (
          user_id, transaction_type, amount, description, status, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          'rank_reward',
          rank.reward_amount,
          `${rank.rank_name} rank achievement reward`,
          'completed'
        ]
      );

      await connection.commit();
      res.json({ message: `User rank updated to ${rank.rank_name} successfully` });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error updating user rank:', error);
    res.status(500).json({ error: 'Failed to update user rank' });
  }
});

export default router;
