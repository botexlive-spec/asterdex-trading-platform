/**
 * Package Purchase API Routes
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

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
 * GET /api/packages
 * Get all available packages
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM packages WHERE is_active = true ORDER BY min_investment ASC'
    );

    const packages = result.rows.map((pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      min_investment: parseFloat(pkg.min_investment),
      max_investment: parseFloat(pkg.max_investment),
      daily_roi_percentage: parseFloat(pkg.daily_roi_percentage),
      duration_days: pkg.duration_days,
      level_income_percentages: pkg.level_income_percentages || [],
      matching_bonus_percentage: parseFloat(pkg.matching_bonus_percentage),
      is_active: pkg.is_active,
    }));

    res.json({ packages });
  } catch (error: any) {
    console.error('❌ Get packages error:', error);
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

/**
 * POST /api/packages/purchase
 * Purchase a package
 */
router.post('/purchase', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { package_id, investment_amount } = req.body;

    // Validate input
    if (!package_id || !investment_amount) {
      return res.status(400).json({ error: 'Package ID and investment amount are required' });
    }

    const amount = parseFloat(investment_amount);

    // Get package details
    const packageResult = await query(
      'SELECT * FROM packages WHERE id = ? AND is_active = true LIMIT 1',
      [package_id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const packageData = packageResult.rows[0];
    const minInvestment = parseFloat(packageData.min_investment);
    const maxInvestment = parseFloat(packageData.max_investment);

    // Validate investment amount
    if (amount < minInvestment || amount > maxInvestment) {
      return res.status(400).json({
        error: `Investment must be between $${minInvestment} and $${maxInvestment}`
      });
    }

    // Get user data
    const userResult = await query(
      'SELECT wallet_balance FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const walletBalance = parseFloat(user.wallet_balance);

    // Check if user has sufficient balance
    if (walletBalance < amount) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        current_balance: walletBalance,
        required: amount
      });
    }

    // Calculate ROI details
    const dailyROI = (amount * parseFloat(packageData.daily_roi_percentage)) / 100;
    const totalROILimit = amount * 2; // 200% total return
    const durationDays = packageData.duration_days;

    // Start transaction
    const activationDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    // Insert user package
    const userPackageResult = await query(
      `INSERT INTO user_packages
       (user_id, package_id, investment_amount, daily_roi_amount, total_roi_earned,
        total_roi_limit, status, activation_date, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 'active', ?, ?, NOW(), NOW())`,
      [userId, package_id, amount, dailyROI, totalROILimit, activationDate, expiryDate]
    );

    const userPackageId = userPackageResult.insertId;

    // Deduct from wallet
    await query(
      'UPDATE users SET wallet_balance = wallet_balance - ?, total_investment = total_investment + ? WHERE id = ?',
      [amount, amount, userId]
    );

    // Create transaction record
    await query(
      `INSERT INTO mlm_transactions
       (user_id, transaction_type, amount, description, status, created_at, updated_at)
       VALUES (?, 'package_purchase', ?, ?, 'completed', NOW(), NOW())`,
      [userId, amount, `Purchased ${packageData.name} - $${amount}`]
    );

    // Distribute 30-level income commissions with eligibility checks
    try {
      const { distribute30LevelIncome } = await import('../services/level-income.service');
      await distribute30LevelIncome(userId, amount, package_id, String(userPackageId));
    } catch (error) {
      console.error(`⚠️  30-level income distribution failed:`, error);
      // Don't fail the entire purchase if level income fails
    }

    // Update binary tree volume for binary matching
    try {
      const { updateBinaryVolume } = await import('../services/binary-matching.service');
      await updateBinaryVolume(userId, amount);
      console.log(`📊 Binary volume updated for user ${userId}`);
    } catch (error) {
      console.error(`⚠️  Binary volume update failed for user ${userId}:`, error);
      // Don't fail the entire purchase if binary update fails
    }

    // Initialize or update booster
    try {
      const { initializeBooster, updateBoosterDirectCount } = await import('../services/booster.service');

      // Check if this is user's first investment (initialize booster)
      const firstPackageCheck = await query(
        'SELECT COUNT(*) as count FROM user_packages WHERE user_id = ?',
        [userId]
      );

      if (parseInt(firstPackageCheck.rows[0].count) === 1) {
        // This is first investment, initialize booster
        await initializeBooster(userId);
        console.log(`🚀 Booster initialized for user ${userId}`);
      }

      // Get user's sponsor and update their booster count if they have active booster
      const userSponsor = await query(
        'SELECT sponsor_id FROM users WHERE id = ? LIMIT 1',
        [userId]
      );

      if (userSponsor.rows.length > 0 && userSponsor.rows[0].sponsor_id) {
        await updateBoosterDirectCount(userSponsor.rows[0].sponsor_id);
      }
    } catch (error) {
      console.error(`⚠️  Booster processing failed:`, error);
      // Don't fail the entire purchase if booster fails
    }

    console.log(`✅ Package purchased: User ${userId}, Package ${package_id}, Amount $${amount}`);

    res.json({
      success: true,
      message: 'Package purchased successfully',
      package: {
        name: packageData.name,
        investment_amount: amount,
        daily_roi: dailyROI,
        total_roi_limit: totalROILimit,
        duration_days: durationDays,
        expiry_date: expiryDate
      }
    });

  } catch (error: any) {
    console.error('❌ Package purchase error:', error);
    res.status(500).json({ error: 'Failed to purchase package' });
  }
});

/**
 * GET /api/packages/my-packages
 * Get user's purchased packages
 */
router.get('/my-packages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await query(
      `SELECT up.*, p.name as package_name, p.daily_roi_percentage
       FROM user_packages up
       JOIN packages p ON up.package_id = p.id
       WHERE up.user_id = ?
       ORDER BY up.created_at DESC`,
      [userId]
    );

    const packages = result.rows.map((pkg: any) => ({
      id: pkg.id,
      package_name: pkg.package_name,
      investment_amount: parseFloat(pkg.investment_amount),
      daily_roi_amount: parseFloat(pkg.daily_roi_amount),
      total_roi_earned: parseFloat(pkg.total_roi_earned),
      total_roi_limit: parseFloat(pkg.total_roi_limit),
      status: pkg.status,
      activation_date: pkg.activation_date,
      expiry_date: pkg.expiry_date,
      days_remaining: Math.max(0, Math.ceil((new Date(pkg.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      progress_percentage: ((parseFloat(pkg.total_roi_earned) / parseFloat(pkg.total_roi_limit)) * 100).toFixed(2)
    }));

    res.json({ packages });
  } catch (error: any) {
    console.error('❌ Get my packages error:', error);
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

export default router;
