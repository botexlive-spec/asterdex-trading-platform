/**
 * Dashboard API Routes
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_jwt_secret_key_change_in_production_2024';

/**
 * GET /api/dashboard
 * Get dashboard data for authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Get user data
    const userResult = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = true LIMIT 1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get team statistics - direct referrals
    const teamResult = await query(
      'SELECT COUNT(*) as direct_count FROM users WHERE sponsor_id = ?',
      [decoded.id]
    );
    const directTeam = parseInt(teamResult.rows[0]?.direct_count || 0);

    // Calculate total team recursively (all downline members)
    const totalTeamResult = await query(
      `WITH RECURSIVE team_tree AS (
        SELECT id, sponsor_id, 1 as level FROM users WHERE sponsor_id = ?
        UNION ALL
        SELECT u.id, u.sponsor_id, tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u.sponsor_id = tt.id
        WHERE tt.level < 30
      )
      SELECT COUNT(*) as total_count FROM team_tree`,
      [decoded.id]
    );
    const totalTeam = parseInt(totalTeamResult.rows[0]?.total_count || 0);

    // Get active user packages
    const packagesResult = await query(
      `SELECT COUNT(*) as active_count,
      SUM(CASE WHEN DATEDIFF(expiry_date, NOW()) <= 7 AND DATEDIFF(expiry_date, NOW()) > 0 THEN 1 ELSE 0 END) as expiring_soon
      FROM user_packages WHERE user_id = ? AND status = 'active'`,
      [decoded.id]
    );
    const activePackages = packagesResult.rows[0] || { active_count: 0, expiring_soon: 0 };

    // Get today's earnings
    const todayEarningsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as today_earnings
      FROM mlm_transactions
      WHERE user_id = ? AND DATE(created_at) = CURDATE() AND status = 'completed'`,
      [decoded.id]
    );
    const todayEarnings = parseFloat(todayEarningsResult.rows[0]?.today_earnings || 0);

    // Get week's earnings
    const weekEarningsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as week_earnings
      FROM mlm_transactions
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 'completed'`,
      [decoded.id]
    );
    const weekEarnings = parseFloat(weekEarningsResult.rows[0]?.week_earnings || 0);

    // Binary volumes from database
    const leftVolume = parseFloat(user.left_volume || 0);
    const rightVolume = parseFloat(user.right_volume || 0);

    // Calculate next rank progress
    const rankOrder = ['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'crown_diamond', 'royal_diamond', 'presidential', 'ambassador'];
    const currentRankIndex = rankOrder.indexOf(user.current_rank || 'starter');
    const nextRankName = currentRankIndex < rankOrder.length - 1 ? rankOrder[currentRankIndex + 1] : user.current_rank;
    const rankProgress = Math.min(Math.floor((totalTeam / 100) * 100), 100); // Simple calculation based on team size

    // Build dashboard response
    console.log('📊 Dashboard API - User data from DB:', {
      email: user.email,
      wallet_balance: user.wallet_balance,
      total_earnings: user.total_earnings,
      total_investment: user.total_investment,
      direct_team: directTeam,
      total_team: totalTeam
    });

    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        current_rank: user.current_rank,
        referral_code: user.referral_code,
        wallet_balance: parseFloat(user.wallet_balance || 0),
        total_investment: parseFloat(user.total_investment || 0),
        total_earnings: parseFloat(user.total_earnings || 0),
        roi_earnings: parseFloat(user.roi_earnings || 0),
        commission_earnings: parseFloat(user.commission_earnings || 0),
        binary_earnings: parseFloat(user.binary_earnings || 0),
      },
      statistics: {
        today_earnings: todayEarnings,
        week_earnings: weekEarnings,
        month_earnings: parseFloat(user.total_earnings || 0),
        roi_earned: parseFloat(user.roi_earnings || 0),
        direct_referrals: directTeam,
        total_team: totalTeam,
        left_binary_volume: leftVolume,
        right_binary_volume: rightVolume,
      },
      packages: {
        active_count: parseInt(activePackages.active_count || 0),
        expiring_soon: parseInt(activePackages.expiring_soon || 0),
      },
      next_rank: {
        current: user.current_rank || 'starter',
        next: nextRankName,
        progress: rankProgress,
      },
    };

    res.json(dashboardData);
  } catch (error: any) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
