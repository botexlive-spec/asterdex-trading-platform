/**
 * Level Unlocks API Routes
 * Endpoints for generation plan level unlock status and progress
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { getGenerationPlanConfig } from '../services/planSettings.service';

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
 * GET /api/level-unlocks/status
 * Get current user's level unlock status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get level unlock record
    const result = await query(
      `SELECT lu.*,
       (SELECT COUNT(*) FROM users WHERE sponsor_id = ? AND is_active = TRUE) as current_directs
       FROM level_unlocks lu
       WHERE lu.user_id = ?
       LIMIT 1`,
      [userId, userId]
    );

    if (result.rows.length === 0) {
      // No level unlocks yet - user has no directs
      return res.json({
        success: true,
        level_unlocks: {
          direct_count: 0,
          unlocked_levels: 0,
          levels: []
        }
      });
    }

    const levelUnlock = result.rows[0];

    // Build array of unlocked levels
    const levels = [];
    for (let i = 1; i <= 15; i++) {
      const isUnlocked = levelUnlock[`level_${i}_unlocked`];
      levels.push({
        level: i,
        is_unlocked: Boolean(isUnlocked)
      });
    }

    res.json({
      success: true,
      level_unlocks: {
        direct_count: parseInt(levelUnlock.current_directs),
        unlocked_levels: levelUnlock.unlocked_levels,
        levels
      }
    });
  } catch (error: any) {
    console.error('❌ Get level unlock status error:', error);
    res.status(500).json({ error: 'Failed to get level unlock status' });
  }
});

/**
 * GET /api/level-unlocks/progress
 * Get progress toward next level unlock
 */
router.get('/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get current direct count
    const directsResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE sponsor_id = ? AND is_active = TRUE',
      [userId]
    );

    const currentDirects = parseInt(directsResult.rows[0]?.count || 0);

    // Get level unlock requirements
    const levelRequirements = [
      { directs: 1, levels: 1 },
      { directs: 2, levels: 2 },
      { directs: 3, levels: 3 },
      { directs: 4, levels: 4 },
      { directs: 5, levels: 5 },
      { directs: 6, levels: 6 },
      { directs: 7, levels: 7 },
      { directs: 8, levels: 8 },
      { directs: 9, levels: 10 },
      { directs: 10, levels: 15 }
    ];

    // Find current and next milestone
    let currentMilestone = null;
    let nextMilestone = null;

    for (let i = 0; i < levelRequirements.length; i++) {
      if (currentDirects >= levelRequirements[i].directs) {
        currentMilestone = levelRequirements[i];
      } else {
        nextMilestone = levelRequirements[i];
        break;
      }
    }

    // Calculate progress
    let progress = 0;
    let directsNeeded = 0;

    if (nextMilestone) {
      const prevDirects = currentMilestone ? currentMilestone.directs : 0;
      const totalNeeded = nextMilestone.directs - prevDirects;
      const currentProgress = currentDirects - prevDirects;
      progress = (currentProgress / totalNeeded) * 100;
      directsNeeded = nextMilestone.directs - currentDirects;
    } else {
      // Max level achieved
      progress = 100;
      directsNeeded = 0;
    }

    res.json({
      success: true,
      progress: {
        current_directs: currentDirects,
        current_unlocked_levels: currentMilestone ? currentMilestone.levels : 0,
        next_unlock_at_directs: nextMilestone ? nextMilestone.directs : null,
        next_unlock_levels: nextMilestone ? nextMilestone.levels : null,
        directs_needed: directsNeeded,
        progress_percentage: Math.min(100, Math.max(0, progress)),
        is_max_level: !nextMilestone,
        milestones: levelRequirements
      }
    });
  } catch (error: any) {
    console.error('❌ Get level unlock progress error:', error);
    res.status(500).json({ error: 'Failed to get level unlock progress' });
  }
});

/**
 * GET /api/level-unlocks/percentages
 * Get ROI-on-ROI percentages for each level
 */
router.get('/percentages', async (req: Request, res: Response) => {
  try {
    const config = await getGenerationPlanConfig();

    if (!config) {
      return res.status(404).json({ error: 'Generation plan configuration not found' });
    }

    const percentages = config.level_percentages.map((percentage, index) => ({
      level: index + 1,
      percentage
    }));

    res.json({
      success: true,
      percentages,
      total_percentage: config.level_percentages.reduce((sum, p) => sum + p, 0)
    });
  } catch (error: any) {
    console.error('❌ Get level percentages error:', error);
    res.status(500).json({ error: 'Failed to get level percentages' });
  }
});

/**
 * GET /api/level-unlocks/my-levels
 * Get detailed info about user's unlocked levels with percentages
 */
router.get('/my-levels', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get level unlock status
    const levelResult = await query(
      `SELECT * FROM level_unlocks WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (levelResult.rows.length === 0) {
      return res.json({
        success: true,
        levels: [],
        unlocked_count: 0
      });
    }

    const levelUnlock = levelResult.rows[0];

    // Get generation plan config
    const config = await getGenerationPlanConfig();
    if (!config) {
      return res.status(404).json({ error: 'Generation plan configuration not found' });
    }

    // Build detailed level info
    const levels = [];
    for (let i = 1; i <= 15; i++) {
      const isUnlocked = levelUnlock[`level_${i}_unlocked`];
      levels.push({
        level: i,
        is_unlocked: Boolean(isUnlocked),
        roi_on_roi_percentage: config.level_percentages[i - 1],
        status: isUnlocked ? 'unlocked' : 'locked'
      });
    }

    // Calculate total earning potential
    const unlockedPercentage = levels
      .filter(l => l.is_unlocked)
      .reduce((sum, l) => sum + l.roi_on_roi_percentage, 0);

    res.json({
      success: true,
      levels,
      unlocked_count: levels.filter(l => l.is_unlocked).length,
      total_earning_potential: unlockedPercentage
    });
  } catch (error: any) {
    console.error('❌ Get my levels error:', error);
    res.status(500).json({ error: 'Failed to get level details' });
  }
});

export default router;
