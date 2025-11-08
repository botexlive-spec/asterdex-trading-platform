/**
 * Monthly Rewards API Routes
 * Endpoints for 3-leg business volume tracking and monthly reward distribution
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  getUserBusinessVolume,
  updateUserBusinessVolume,
  getAllRewards,
  getRewardById,
  createReward,
  updateReward,
  deleteReward,
  checkAndDistributeRewards,
  getUserRewardHistory
} from '../services/rewards.service';

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
 * GET /api/rewards
 * Get all active rewards
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rewards = await getAllRewards();

    res.json({
      success: true,
      rewards,
      count: rewards.length
    });
  } catch (error: any) {
    console.error('❌ Get rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

/**
 * GET /api/rewards/:id
 * Get specific reward by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rewardId = parseInt(req.params.id);

    if (!rewardId) {
      return res.status(400).json({ error: 'Invalid reward ID' });
    }

    const reward = await getRewardById(rewardId);

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({
      success: true,
      reward
    });
  } catch (error: any) {
    console.error('❌ Get reward error:', error);
    res.status(500).json({ error: 'Failed to get reward' });
  }
});

/**
 * GET /api/rewards/business-volume/my-volume
 * Get current user's business volume for current month
 */
router.get('/business-volume/my-volume', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month, year } = req.query;

    const targetMonth = month ? parseInt(month as string) : undefined;
    const targetYear = year ? parseInt(year as string) : undefined;

    const volume = await getUserBusinessVolume(userId, targetMonth, targetYear);

    if (!volume) {
      return res.json({
        success: true,
        has_volume: false,
        message: 'No business volume data available'
      });
    }

    // Calculate percentage distribution
    const totalVolume = volume.leg1_volume + volume.leg2_volume + volume.leg3_volume;
    const leg1Percentage = totalVolume > 0 ? (volume.leg1_volume / totalVolume) * 100 : 0;
    const leg2Percentage = totalVolume > 0 ? (volume.leg2_volume / totalVolume) * 100 : 0;
    const leg3Percentage = totalVolume > 0 ? (volume.leg3_volume / totalVolume) * 100 : 0;

    // Check if ratio meets 40:40:20 requirement
    const isQualified = leg1Percentage >= 40 && leg2Percentage >= 40 && leg3Percentage >= 20;

    res.json({
      success: true,
      has_volume: true,
      volume: {
        leg1_volume: volume.leg1_volume,
        leg2_volume: volume.leg2_volume,
        leg3_volume: volume.leg3_volume,
        total_volume: totalVolume,
        qualified_volume: volume.qualified_volume,
        leg1_percentage: leg1Percentage.toFixed(2),
        leg2_percentage: leg2Percentage.toFixed(2),
        leg3_percentage: leg3Percentage.toFixed(2),
        is_qualified: isQualified,
        period_month: volume.period_month,
        period_year: volume.period_year,
        last_updated: volume.last_updated
      }
    });
  } catch (error: any) {
    console.error('❌ Get user business volume error:', error);
    res.status(500).json({ error: 'Failed to get business volume' });
  }
});

/**
 * POST /api/rewards/business-volume/refresh
 * Manually refresh user's business volume (for testing)
 */
router.post('/business-volume/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month, year } = req.body;

    await updateUserBusinessVolume(userId, month, year);

    const updatedVolume = await getUserBusinessVolume(userId, month, year);

    res.json({
      success: true,
      message: 'Business volume refreshed successfully',
      volume: updatedVolume
    });
  } catch (error: any) {
    console.error('❌ Refresh business volume error:', error);
    res.status(500).json({ error: 'Failed to refresh business volume' });
  }
});

/**
 * GET /api/rewards/my-rewards
 * Get current user's reward history
 */
router.get('/my-rewards/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 50 } = req.query;

    const history = await getUserRewardHistory(userId, parseInt(limit as string));

    res.json({
      success: true,
      rewards: history,
      count: history.length
    });
  } catch (error: any) {
    console.error('❌ Get reward history error:', error);
    res.status(500).json({ error: 'Failed to get reward history' });
  }
});

/**
 * GET /api/rewards/my-rewards/qualified
 * Check which rewards user currently qualifies for
 */
router.get('/my-rewards/qualified', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const volume = await getUserBusinessVolume(userId);
    const allRewards = await getAllRewards();

    if (!volume || volume.qualified_volume === 0) {
      return res.json({
        success: true,
        qualified: [],
        current_volume: 0,
        message: 'No qualified business volume'
      });
    }

    const qualifiedRewards = allRewards.filter(
      reward => volume.qualified_volume >= reward.required_volume
    );

    const nextReward = allRewards.find(
      reward => volume.qualified_volume < reward.required_volume
    );

    res.json({
      success: true,
      qualified: qualifiedRewards,
      current_volume: volume.qualified_volume,
      next_reward: nextReward || null,
      volume_needed: nextReward ? nextReward.required_volume - volume.qualified_volume : 0
    });
  } catch (error: any) {
    console.error('❌ Get qualified rewards error:', error);
    res.status(500).json({ error: 'Failed to get qualified rewards' });
  }
});

/**
 * POST /api/rewards/claim
 * Manually claim rewards (trigger distribution)
 */
router.post('/claim', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { month, year } = req.body;

    const distributions = await checkAndDistributeRewards(userId, month, year);

    if (distributions.length === 0) {
      return res.json({
        success: false,
        message: 'No rewards to claim or already claimed'
      });
    }

    res.json({
      success: true,
      message: `${distributions.length} reward(s) claimed successfully`,
      distributions
    });
  } catch (error: any) {
    console.error('❌ Claim rewards error:', error);
    res.status(500).json({
      error: error.message || 'Failed to claim rewards'
    });
  }
});

/**
 * POST /api/rewards/admin/create
 * Create new reward (admin only)
 */
router.post('/admin/create', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { milestone_name, required_volume, reward_amount, description } = req.body;

    if (!milestone_name || !required_volume || !reward_amount) {
      return res.status(400).json({
        error: 'milestone_name, required_volume, and reward_amount are required'
      });
    }

    const reward = await createReward(
      milestone_name,
      parseFloat(required_volume),
      parseFloat(reward_amount),
      description || ''
    );

    console.log(`✅ Reward created by admin ${(req as any).user.id}: ${milestone_name}`);

    res.json({
      success: true,
      message: 'Reward created successfully',
      reward
    });
  } catch (error: any) {
    console.error('❌ Create reward error:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

/**
 * PUT /api/rewards/admin/:id
 * Update reward (admin only)
 */
router.put('/admin/:id', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const rewardId = parseInt(req.params.id);
    const updates = req.body;

    if (!rewardId) {
      return res.status(400).json({ error: 'Invalid reward ID' });
    }

    // Check if reward exists
    const existing = await getRewardById(rewardId);
    if (!existing) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    await updateReward(rewardId, updates);

    const updated = await getRewardById(rewardId);

    console.log(`✅ Reward ${rewardId} updated by admin ${(req as any).user.id}`);

    res.json({
      success: true,
      message: 'Reward updated successfully',
      reward: updated
    });
  } catch (error: any) {
    console.error('❌ Update reward error:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

/**
 * DELETE /api/rewards/admin/:id
 * Delete reward (admin only)
 */
router.delete('/admin/:id', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const rewardId = parseInt(req.params.id);

    if (!rewardId) {
      return res.status(400).json({ error: 'Invalid reward ID' });
    }

    // Check if reward exists
    const existing = await getRewardById(rewardId);
    if (!existing) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    await deleteReward(rewardId);

    console.log(`✅ Reward ${rewardId} deleted by admin ${(req as any).user.id}`);

    res.json({
      success: true,
      message: 'Reward deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Delete reward error:', error);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

export default router;
