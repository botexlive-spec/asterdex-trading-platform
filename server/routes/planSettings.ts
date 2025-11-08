/**
 * Plan Settings API Routes
 * Admin endpoints for managing plan configurations and toggles
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  getAllPlanSettings,
  getPlanSetting,
  updatePlanSetting,
  togglePlan,
  isPlanActive,
  validateInvestmentAmount
} from '../services/planSettings.service';

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
 * GET /api/plan-settings
 * Get all plan settings (public - shows active status)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getAllPlanSettings();

    // Return minimal info for non-admin users
    const publicSettings = settings.map(s => ({
      feature_key: s.feature_key,
      feature_name: s.feature_name,
      is_active: s.is_active
    }));

    res.json({
      success: true,
      settings: publicSettings
    });
  } catch (error: any) {
    console.error('❌ Get plan settings error:', error);
    res.status(500).json({ error: 'Failed to get plan settings' });
  }
});

/**
 * GET /api/plan-settings/all
 * Get all plan settings with full details (admin only)
 */
router.get('/all', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await getAllPlanSettings();

    res.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error('❌ Get all plan settings error:', error);
    res.status(500).json({ error: 'Failed to get plan settings' });
  }
});

/**
 * GET /api/plan-settings/:feature_key
 * Get specific plan setting
 */
router.get('/:feature_key', async (req: Request, res: Response) => {
  try {
    const { feature_key } = req.params;

    const setting = await getPlanSetting(feature_key);

    if (!setting) {
      return res.status(404).json({ error: 'Plan setting not found' });
    }

    res.json({
      success: true,
      setting
    });
  } catch (error: any) {
    console.error('❌ Get plan setting error:', error);
    res.status(500).json({ error: 'Failed to get plan setting' });
  }
});

/**
 * GET /api/plan-settings/:feature_key/status
 * Check if plan is active (public)
 */
router.get('/:feature_key/status', async (req: Request, res: Response) => {
  try {
    const { feature_key } = req.params;

    const isActive = await isPlanActive(feature_key);

    res.json({
      success: true,
      feature_key,
      is_active: isActive
    });
  } catch (error: any) {
    console.error('❌ Check plan status error:', error);
    res.status(500).json({ error: 'Failed to check plan status' });
  }
});

/**
 * PUT /api/plan-settings/:feature_key
 * Update plan setting (admin only)
 */
router.put('/:feature_key', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { feature_key } = req.params;
    const updates = req.body;

    // Check if plan exists
    const existing = await getPlanSetting(feature_key);
    if (!existing) {
      return res.status(404).json({ error: 'Plan setting not found' });
    }

    await updatePlanSetting(feature_key, updates);

    const updated = await getPlanSetting(feature_key);

    console.log(`✅ Plan setting updated: ${feature_key} by admin ${(req as any).user.id}`);

    res.json({
      success: true,
      message: 'Plan setting updated successfully',
      setting: updated
    });
  } catch (error: any) {
    console.error('❌ Update plan setting error:', error);
    res.status(500).json({ error: error.message || 'Failed to update plan setting' });
  }
});

/**
 * POST /api/plan-settings/:feature_key/toggle
 * Toggle plan active status (admin only)
 */
router.post('/:feature_key/toggle', authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { feature_key } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    // Check if plan exists
    const existing = await getPlanSetting(feature_key);
    if (!existing) {
      return res.status(404).json({ error: 'Plan setting not found' });
    }

    await togglePlan(feature_key, is_active);

    const updated = await getPlanSetting(feature_key);

    console.log(`✅ Plan toggled: ${feature_key} = ${is_active} by admin ${(req as any).user.id}`);

    res.json({
      success: true,
      message: `Plan ${is_active ? 'activated' : 'deactivated'} successfully`,
      setting: updated
    });
  } catch (error: any) {
    console.error('❌ Toggle plan error:', error);
    res.status(500).json({ error: 'Failed to toggle plan' });
  }
});

/**
 * POST /api/plan-settings/validate-investment
 * Validate investment amount according to current settings
 */
router.post('/validate-investment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const validation = await validateInvestmentAmount(parseFloat(amount));

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: validation.message
      });
    }

    res.json({
      success: true,
      valid: true,
      amount: parseFloat(amount),
      message: 'Investment amount is valid'
    });
  } catch (error: any) {
    console.error('❌ Validate investment error:', error);
    res.status(500).json({ error: 'Failed to validate investment' });
  }
});

/**
 * GET /api/plan-settings/active-plans/summary
 * Get summary of all active plans (for dashboard)
 */
router.get('/active-plans/summary', async (req: Request, res: Response) => {
  try {
    const settings = await getAllPlanSettings();

    const summary = {
      binary_plan: false,
      generation_plan: false,
      robot_plan: false,
      investment_plan: false,
      booster_income: false,
      principal_withdrawal: false,
      monthly_rewards: false
    };

    settings.forEach(setting => {
      if (summary.hasOwnProperty(setting.feature_key)) {
        (summary as any)[setting.feature_key] = setting.is_active;
      }
    });

    res.json({
      success: true,
      active_plans: summary
    });
  } catch (error: any) {
    console.error('❌ Get active plans summary error:', error);
    res.status(500).json({ error: 'Failed to get active plans summary' });
  }
});

export default router;
