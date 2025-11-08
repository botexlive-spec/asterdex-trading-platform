/**
 * Booster API Routes
 * Endpoints for booster income tracking and status
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  getBoosterStatus,
  getAllActiveBoosters,
  updateBoosterDirectCount
} from '../services/booster.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_jwt_secret_key_change_in_production_2024';

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
 * Middleware to verify admin role
 */
function authenticateAdmin(req: Request, res: Response, next: any) {
  const user = (req as any).user;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}

/**
 * GET /api/booster/status
 * Get current user's booster status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const booster = await getBoosterStatus(userId);

    if (!booster) {
      return res.json({
        success: true,
        has_booster: false,
        message: 'No active booster. Make your first investment to start!'
      });
    }

    res.json({
      success: true,
      has_booster: true,
      booster: {
        id: booster.id,
        start_date: booster.start_date,
        end_date: booster.end_date,
        direct_count: booster.direct_count,
        target_directs: booster.target_directs,
        bonus_roi_percentage: booster.bonus_roi_percentage,
        status: booster.status,
        days_remaining: booster.days_remaining,
        is_achieved: booster.status === 'achieved',
        progress_percentage: (booster.direct_count / booster.target_directs) * 100
      }
    });
  } catch (error: any) {
    console.error('❌ Get booster status error:', error);
    res.status(500).json({ error: 'Failed to get booster status' });
  }
});

/**
 * GET /api/booster/all
 * Get all active boosters (admin only)
 */
router.get('/all', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const boosters = await getAllActiveBoosters();

    const summary = {
      total_active: boosters.filter(b => b.status === 'active').length,
      total_achieved: boosters.filter(b => b.status === 'achieved').length,
      total: boosters.length
    };

    res.json({
      success: true,
      boosters,
      summary
    });
  } catch (error: any) {
    console.error('❌ Get all boosters error:', error);
    res.status(500).json({ error: 'Failed to get boosters' });
  }
});

/**
 * POST /api/booster/refresh
 * Manually refresh booster direct count (for testing/admin)
 */
router.post('/refresh', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    await updateBoosterDirectCount(user_id);

    const updated = await getBoosterStatus(user_id);

    console.log(`✅ Booster refreshed for user ${user_id} by admin ${(req as any).user.id}`);

    res.json({
      success: true,
      message: 'Booster updated successfully',
      booster: updated
    });
  } catch (error: any) {
    console.error('❌ Refresh booster error:', error);
    res.status(500).json({ error: 'Failed to refresh booster' });
  }
});

/**
 * GET /api/booster/countdown
 * Get booster countdown info for current user
 */
router.get('/countdown', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const booster = await getBoosterStatus(userId);

    if (!booster) {
      return res.json({
        success: true,
        has_countdown: false,
        message: 'No active booster countdown'
      });
    }

    const now = new Date();
    const endDate = new Date(booster.end_date);
    const hoursRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const minutesRemaining = Math.max(0, Math.floor(((endDate.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

    res.json({
      success: true,
      has_countdown: true,
      countdown: {
        days_remaining: booster.days_remaining || 0,
        hours_remaining: hoursRemaining,
        minutes_remaining: minutesRemaining,
        end_date: endDate,
        status: booster.status,
        is_active: booster.status === 'active' || booster.status === 'achieved',
        direct_count: booster.direct_count,
        target_directs: booster.target_directs,
        progress_percentage: (booster.direct_count / booster.target_directs) * 100,
        is_achieved: booster.status === 'achieved'
      }
    });
  } catch (error: any) {
    console.error('❌ Get booster countdown error:', error);
    res.status(500).json({ error: 'Failed to get booster countdown' });
  }
});

export default router;
