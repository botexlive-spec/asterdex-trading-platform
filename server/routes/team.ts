/**
 * Team & Referral API Routes
 * Handles team structure, referrals, and downline management using recursive CTEs
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_mlm_secret_key_change_in_production_2024';

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Team API] No authorization token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    console.error('[Team API] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * GET /api/team/members
 * Get all team members with level-wise breakdown using recursive CTE (up to 30 levels)
 */
router.get('/members', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log('🔍 [Team API] Fetching team members for user:', userId);

    // Get all downline members using recursive CTE (up to 30 levels)
    const [rows] = await pool.query<RowDataPacket[]>(
      `WITH RECURSIVE team_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT
          id,
          email,
          full_name,
          sponsor_id,
          referral_code,
          wallet_balance,
          total_earnings,
          total_investment,
          total_withdrawal,
          current_rank,
          left_volume,
          right_volume,
          phone_number,
          country,
          kyc_status,
          email_verified,
          is_active,
          role,
          created_at,
          updated_at,
          1 as level
        FROM users
        WHERE sponsor_id = ?

        UNION ALL

        -- Recursive case: get children at each level
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.sponsor_id,
          u.referral_code,
          u.wallet_balance,
          u.total_earnings,
          u.total_investment,
          u.total_withdrawal,
          u.current_rank,
          u.left_volume,
          u.right_volume,
          u.phone_number,
          u.country,
          u.kyc_status,
          u.email_verified,
          u.is_active,
          u.role,
          u.created_at,
          u.updated_at,
          tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < 30  -- Limit to 30 levels deep
      )
      SELECT
        id,
        email,
        full_name,
        sponsor_id,
        referral_code,
        CAST(wallet_balance AS DECIMAL(15,2)) as wallet_balance,
        CAST(total_earnings AS DECIMAL(15,2)) as total_earnings,
        CAST(total_investment AS DECIMAL(15,2)) as total_investment,
        CAST(total_withdrawal AS DECIMAL(15,2)) as total_withdrawal,
        current_rank,
        CAST(left_volume AS DECIMAL(15,2)) as left_volume,
        CAST(right_volume AS DECIMAL(15,2)) as right_volume,
        phone_number,
        country,
        kyc_status,
        email_verified,
        is_active,
        role,
        created_at,
        updated_at,
        level
      FROM team_tree
      ORDER BY level ASC, created_at ASC`,
      [userId]
    );

    const members = rows || [];

    console.log(`✅ [Team API] Found ${members.length} team members`);

    // Calculate statistics by level
    const levelStats: Record<number, any> = {};
    let totalInvestment = 0;
    let totalEarnings = 0;
    let totalWithdrawal = 0;
    let totalWalletBalance = 0;
    let totalActive = 0;
    let maxDepth = 0;

    members.forEach((member: any) => {
      const level = member.level;
      maxDepth = Math.max(maxDepth, level);

      if (!levelStats[level]) {
        levelStats[level] = {
          level,
          count: 0,
          active: 0,
          inactive: 0,
          total_investment: 0,
          total_earnings: 0,
          total_withdrawal: 0,
          total_wallet_balance: 0,
        };
      }

      levelStats[level].count++;
      levelStats[level].total_investment += parseFloat(member.total_investment || 0);
      levelStats[level].total_earnings += parseFloat(member.total_earnings || 0);
      levelStats[level].total_withdrawal += parseFloat(member.total_withdrawal || 0);
      levelStats[level].total_wallet_balance += parseFloat(member.wallet_balance || 0);

      if (member.is_active) {
        levelStats[level].active++;
        totalActive++;
      } else {
        levelStats[level].inactive++;
      }

      totalInvestment += parseFloat(member.total_investment || 0);
      totalEarnings += parseFloat(member.total_earnings || 0);
      totalWithdrawal += parseFloat(member.total_withdrawal || 0);
      totalWalletBalance += parseFloat(member.wallet_balance || 0);
    });

    // Convert to array and sort by level
    const levels = Object.values(levelStats).sort((a: any, b: any) => a.level - b.level);

    // Count direct members (level 1)
    const directCount = levelStats[1]?.count || 0;

    res.json({
      success: true,
      summary: {
        direct_members: directCount,
        total_team: members.length,
        total_active: totalActive,
        total_inactive: members.length - totalActive,
        total_investment: totalInvestment,
        total_earnings: totalEarnings,
        total_withdrawal: totalWithdrawal,
        total_wallet_balance: totalWalletBalance,
        max_depth: maxDepth,
      },
      levels,
      members,
    });
  } catch (error: any) {
    console.error('❌ [Team API] Error fetching team members:', error);
    console.error('❌ [Team API] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch team members',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/team/direct
 * Get only direct referrals (Level 1)
 */
router.get('/direct', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log('🔍 [Team API] Fetching direct referrals for user:', userId);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id,
        email,
        full_name,
        sponsor_id,
        referral_code,
        CAST(wallet_balance AS DECIMAL(15,2)) as wallet_balance,
        CAST(total_earnings AS DECIMAL(15,2)) as total_earnings,
        CAST(total_investment AS DECIMAL(15,2)) as total_investment,
        CAST(total_withdrawal AS DECIMAL(15,2)) as total_withdrawal,
        current_rank,
        CAST(left_volume AS DECIMAL(15,2)) as left_volume,
        CAST(right_volume AS DECIMAL(15,2)) as right_volume,
        phone_number,
        country,
        kyc_status,
        email_verified,
        is_active,
        role,
        created_at,
        updated_at
      FROM users
      WHERE sponsor_id = ?
      ORDER BY created_at DESC`,
      [userId]
    );

    const members = rows || [];

    // Calculate summary stats
    let totalInvestment = 0;
    let totalEarnings = 0;
    let activeCount = 0;

    members.forEach((member: any) => {
      totalInvestment += parseFloat(member.total_investment || 0);
      totalEarnings += parseFloat(member.total_earnings || 0);
      if (member.is_active) activeCount++;
    });

    console.log(`✅ [Team API] Found ${members.length} direct referrals`);

    res.json({
      success: true,
      count: members.length,
      summary: {
        total_count: members.length,
        active_count: activeCount,
        inactive_count: members.length - activeCount,
        total_investment: totalInvestment,
        total_earnings: totalEarnings,
      },
      members,
    });
  } catch (error: any) {
    console.error('❌ [Team API] Error fetching direct referrals:', error);
    console.error('❌ [Team API] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch direct referrals',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/team/stats
 * Get comprehensive team statistics summary
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log('🔍 [Team API] Fetching team stats for user:', userId);

    // Get comprehensive team stats using recursive CTE
    const [statsRows] = await pool.query<RowDataPacket[]>(
      `WITH RECURSIVE team_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT
          id,
          sponsor_id,
          total_investment,
          total_earnings,
          total_withdrawal,
          wallet_balance,
          is_active,
          1 as level
        FROM users
        WHERE sponsor_id = ?

        UNION ALL

        -- Recursive case: get children at each level
        SELECT
          u.id,
          u.sponsor_id,
          u.total_investment,
          u.total_earnings,
          u.total_withdrawal,
          u.wallet_balance,
          u.is_active,
          tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < 30
      )
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN level = 1 THEN 1 ELSE 0 END) as direct_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count,
        COALESCE(SUM(total_investment), 0) as total_investment,
        COALESCE(SUM(total_earnings), 0) as total_earnings,
        COALESCE(SUM(total_withdrawal), 0) as total_withdrawal,
        COALESCE(SUM(wallet_balance), 0) as total_wallet_balance,
        MAX(level) as max_depth
      FROM team_tree`,
      [userId]
    );

    const stats = statsRows[0] || {};

    // Parse the values
    const result = {
      success: true,
      direct_members: parseInt(stats.direct_count || 0),
      total_team: parseInt(stats.total_count || 0),
      total_active: parseInt(stats.active_count || 0),
      total_inactive: parseInt(stats.inactive_count || 0),
      team_investment: parseFloat(stats.total_investment || 0),
      team_earnings: parseFloat(stats.total_earnings || 0),
      team_withdrawal: parseFloat(stats.total_withdrawal || 0),
      team_wallet_balance: parseFloat(stats.total_wallet_balance || 0),
      max_depth: parseInt(stats.max_depth || 0),
    };

    console.log(`✅ [Team API] Team stats:`, result);

    res.json(result);
  } catch (error: any) {
    console.error('❌ [Team API] Error fetching team stats:', error);
    console.error('❌ [Team API] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch team stats',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/team/level/:level
 * Get members at a specific level (1-30)
 */
router.get('/level/:level', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const targetLevel = parseInt(req.params.level);

    // Validate level parameter
    if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > 30) {
      console.error('[Team API] Invalid level requested:', req.params.level);
      return res.status(400).json({
        error: 'Invalid level parameter',
        message: 'Level must be a number between 1 and 30',
      });
    }

    console.log(`🔍 [Team API] Fetching level ${targetLevel} members for user:`, userId);

    // Get members at specific level using recursive CTE
    const [rows] = await pool.query<RowDataPacket[]>(
      `WITH RECURSIVE team_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT
          id,
          sponsor_id,
          1 as level
        FROM users
        WHERE sponsor_id = ?

        UNION ALL

        -- Recursive case: get children at each level
        SELECT
          u.id,
          u.sponsor_id,
          tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < ?
      )
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.sponsor_id,
        u.referral_code,
        CAST(u.wallet_balance AS DECIMAL(15,2)) as wallet_balance,
        CAST(u.total_earnings AS DECIMAL(15,2)) as total_earnings,
        CAST(u.total_investment AS DECIMAL(15,2)) as total_investment,
        CAST(u.total_withdrawal AS DECIMAL(15,2)) as total_withdrawal,
        u.current_rank,
        CAST(u.left_volume AS DECIMAL(15,2)) as left_volume,
        CAST(u.right_volume AS DECIMAL(15,2)) as right_volume,
        u.phone_number,
        u.country,
        u.kyc_status,
        u.email_verified,
        u.is_active,
        u.role,
        u.created_at,
        u.updated_at,
        tt.level
      FROM team_tree tt
      INNER JOIN users u ON tt.id = u.id
      WHERE tt.level = ?
      ORDER BY u.created_at DESC`,
      [userId, targetLevel, targetLevel]
    );

    const members = rows || [];

    // Calculate summary stats for this level
    let totalInvestment = 0;
    let totalEarnings = 0;
    let activeCount = 0;

    members.forEach((member: any) => {
      totalInvestment += parseFloat(member.total_investment || 0);
      totalEarnings += parseFloat(member.total_earnings || 0);
      if (member.is_active) activeCount++;
    });

    console.log(`✅ [Team API] Found ${members.length} members at level ${targetLevel}`);

    res.json({
      success: true,
      level: targetLevel,
      count: members.length,
      summary: {
        total_count: members.length,
        active_count: activeCount,
        inactive_count: members.length - activeCount,
        total_investment: totalInvestment,
        total_earnings: totalEarnings,
      },
      members,
    });
  } catch (error: any) {
    console.error('❌ [Team API] Error fetching level members:', error);
    console.error('❌ [Team API] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch level members',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
