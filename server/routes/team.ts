/**
 * Team & Referral API Routes
 * Handles team structure, referrals, and downline management
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_mlm_secret_key_change_in_production_2024';

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * GET /api/team/members
 * Get all team members with level-wise breakdown (up to 30 levels)
 */
router.get('/members', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log('🔍 [Team API] Fetching team members for user:', userId);

    // Get all downline members using recursive CTE (up to 30 levels)
    const result = await query(
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
          created_at,
          updated_at,
          1 as level
        FROM users
        WHERE sponsor_id = ?

        UNION ALL

        -- Recursive case: get children of current level
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
          u.created_at,
          u.updated_at,
          tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < 30  -- Limit to 30 levels
      )
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
        created_at,
        updated_at,
        level
      FROM team_tree
      ORDER BY level ASC, created_at ASC`,
      [userId]
    );

    const members = result.rows || [];

    console.log(`✅ [Team API] Found ${members.length} team members`);

    // Calculate statistics by level
    const levelStats: Record<number, any> = {};
    let totalInvestment = 0;
    let totalEarnings = 0;
    let totalActive = 0;

    members.forEach((member: any) => {
      const level = member.level;

      if (!levelStats[level]) {
        levelStats[level] = {
          level,
          count: 0,
          active: 0,
          inactive: 0,
          total_investment: 0,
          total_earnings: 0,
        };
      }

      levelStats[level].count++;
      levelStats[level].total_investment += parseFloat(member.total_investment || 0);
      levelStats[level].total_earnings += parseFloat(member.total_earnings || 0);

      if (member.is_active) {
        levelStats[level].active++;
        totalActive++;
      } else {
        levelStats[level].inactive++;
      }

      totalInvestment += parseFloat(member.total_investment || 0);
      totalEarnings += parseFloat(member.total_earnings || 0);
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
        max_depth: levels.length,
      },
      levels,
      members,
    });
  } catch (error: any) {
    console.error('❌ [Team API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/**
 * GET /api/team/direct
 * Get only direct referrals (Level 1)
 */
router.get('/direct', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await query(
      `SELECT
        id,
        email,
        full_name,
        sponsor_id,
        referral_code,
        wallet_balance,
        total_earnings,
        total_investment,
        current_rank,
        kyc_status,
        is_active,
        created_at
      FROM users
      WHERE sponsor_id = ?
      ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      members: result.rows,
    });
  } catch (error: any) {
    console.error('❌ Error fetching direct referrals:', error);
    res.status(500).json({ error: 'Failed to fetch direct referrals' });
  }
});

/**
 * GET /api/team/stats
 * Get team statistics summary
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get direct referrals count
    const directResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE sponsor_id = ?',
      [userId]
    );
    const directCount = parseInt(directResult.rows[0]?.count || 0);

    // Get total team count (all levels)
    const totalResult = await query(
      `WITH RECURSIVE team_tree AS (
        SELECT id, sponsor_id, 1 as level
        FROM users
        WHERE sponsor_id = ?

        UNION ALL

        SELECT u.id, u.sponsor_id, tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < 30
      )
      SELECT COUNT(*) as total_count FROM team_tree`,
      [userId]
    );
    const totalCount = parseInt(totalResult.rows[0]?.total_count || 0);

    // Get team investment total
    const investmentResult = await query(
      `WITH RECURSIVE team_tree AS (
        SELECT id FROM users WHERE sponsor_id = ?
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
      )
      SELECT COALESCE(SUM(total_investment), 0) as total
      FROM users
      WHERE id IN (SELECT id FROM team_tree)`,
      [userId]
    );
    const teamInvestment = parseFloat(investmentResult.rows[0]?.total || 0);

    res.json({
      success: true,
      direct_members: directCount,
      total_team: totalCount,
      team_investment: teamInvestment,
    });
  } catch (error: any) {
    console.error('❌ Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

/**
 * GET /api/team/level/:level
 * Get members at a specific level
 */
router.get('/level/:level', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const targetLevel = parseInt(req.params.level);

    if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > 30) {
      return res.status(400).json({ error: 'Invalid level (must be 1-30)' });
    }

    // Get members at specific level
    const result = await query(
      `WITH RECURSIVE team_tree AS (
        SELECT id, sponsor_id, 1 as level FROM users WHERE sponsor_id = ?
        UNION ALL
        SELECT u.id, u.sponsor_id, tt.level + 1
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
        u.wallet_balance,
        u.total_investment,
        u.total_earnings,
        u.current_rank,
        u.kyc_status,
        u.is_active,
        u.created_at,
        tt.level
      FROM team_tree tt
      JOIN users u ON tt.id = u.id
      WHERE tt.level = ?
      ORDER BY u.created_at DESC`,
      [userId, targetLevel, targetLevel]
    );

    res.json({
      success: true,
      level: targetLevel,
      count: result.rows.length,
      members: result.rows,
    });
  } catch (error: any) {
    console.error('❌ Error fetching level members:', error);
    res.status(500).json({ error: 'Failed to fetch level members' });
  }
});

export default router;
