/**
 * Admin CRUD API Routes
 * Comprehensive administrative operations for MLM system
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db';
import { distributeROI } from '../cron/roi-distribution';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_jwt_secret_key_change_in_production_2024';

/**
 * Middleware to verify JWT token and admin role
 */
function authenticateAdmin(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    (req as any).admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get paginated users
    const usersResult = await query(
      `SELECT id, email, full_name, role, sponsor_id, referral_code, wallet_balance,
       total_investment, total_earnings, roi_on_roi_earnings, booster_earnings, reward_earnings,
       current_rank, kyc_status, email_verified, is_active, created_at, updated_at,
       phone_number, country, left_volume, right_volume, direct_referrals_count
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user details
 */
router.get('/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userResult = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's packages
    const packagesResult = await query(
      `SELECT up.*, p.name as package_name
       FROM user_packages up
       JOIN packages p ON up.package_id = p.id
       WHERE up.user_id = ?
       ORDER BY up.created_at DESC`,
      [id]
    );

    // Get user's commissions
    const commissionsResult = await query(
      `SELECT c.*, u.email as from_user_email
       FROM commissions c
       LEFT JOIN users u ON c.from_user_id = u.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [id]
    );

    // Get user's transactions
    const transactionsResult = await query(
      `SELECT * FROM mlm_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    );

    // Get referrals count
    const referralsResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE sponsor_id = ?',
      [id]
    );

    res.json({
      user,
      packages: packagesResult.rows,
      commissions: commissionsResult.rows,
      transactions: transactionsResult.rows,
      referrals_count: parseInt(referralsResult.rows[0]?.count || 0)
    });
  } catch (error: any) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/admin/users
 * Create new user with binary tree placement
 */
router.post('/users', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      initialInvestment = 0,
      parentId,
      position, // 'left' or 'right'
    } = req.body;

    console.log('👤 [Admin] Creating new user:', { email, parentId, position });

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (!parentId || !position) {
      return res.status(400).json({ error: 'Parent ID and position (left/right) are required' });
    }

    if (position !== 'left' && position !== 'right') {
      return res.status(400).json({ error: 'Position must be "left" or "right"' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Check if parent exists
    const parentResult = await query('SELECT id FROM users WHERE id = ?', [parentId]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent user not found' });
    }

    // Check if parent has a binary node
    const parentBinaryNode = await query(
      'SELECT id, leftChildId, rightChildId FROM mlm_binary_node WHERE referralId = ?',
      [parentId]
    );

    if (parentBinaryNode.rows.length === 0) {
      return res.status(400).json({ error: 'Parent does not have a binary tree node' });
    }

    const parentNode = parentBinaryNode.rows[0];

    // Check if position is already occupied
    const occupiedChildId = position === 'left' ? parentNode.leftChildId : parentNode.rightChildId;
    if (occupiedChildId) {
      return res.status(400).json({ error: `${position} position is already occupied` });
    }

    // Generate unique referral code
    const referralCode = `REF${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    await query(
      `INSERT INTO users (
        id, email, password_hash, full_name, role, sponsor_id, referral_code,
        wallet_balance, total_investment, total_earnings, roi_earnings,
        commission_earnings, binary_earnings, current_rank, left_volume,
        right_volume, phone_number, kyc_status, email_verified, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email,
        passwordHash,
        fullName,
        'user',
        parentId,
        referralCode,
        initialInvestment,
        initialInvestment,
        0, // total_earnings
        0, // roi_earnings
        0, // commission_earnings
        0, // binary_earnings
        'starter',
        0, // left_volume
        0, // right_volume
        phone || null,
        'not_submitted',
        false,
        true,
      ]
    );

    console.log(`✅ [Admin] User created: ${userId}`);

    // Create binary tree node for new user
    const nodeId = crypto.randomUUID();
    await query(
      `INSERT INTO mlm_binary_node (id, referralId, parentId, leftChildId, rightChildId)
       VALUES (?, ?, ?, NULL, NULL)`,
      [nodeId, userId, parentNode.id]
    );

    console.log(`✅ [Admin] Binary node created: ${nodeId}`);

    // Update parent's child pointer
    const updateField = position === 'left' ? 'leftChildId' : 'rightChildId';
    await query(
      `UPDATE mlm_binary_node SET ${updateField} = ? WHERE id = ?`,
      [nodeId, parentNode.id]
    );

    console.log(`✅ [Admin] Placed user at ${position} of parent ${parentId}`);

    // Update sponsor's level unlocks (generation plan)
    if (parentId) {
      try {
        const { updateUserLevelUnlocks } = await import('../services/generation-plan.service');
        await updateUserLevelUnlocks(parentId);
        console.log(`✅ [Admin] Updated level unlocks for sponsor ${parentId}`);
      } catch (error) {
        console.error(`⚠️  Failed to update level unlocks for sponsor:`, error);
        // Don't fail user creation if level unlock update fails
      }
    }

    // Create transaction record for initial investment if any
    if (initialInvestment > 0) {
      await query(
        `INSERT INTO mlm_transactions (
          user_id, transaction_type, amount, status, description
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          'package_purchase',
          initialInvestment,
          'completed',
          'Initial investment upon account creation',
        ]
      );
    }

    // Get created user (without password)
    const userResult = await query(
      'SELECT id, email, full_name, referral_code, wallet_balance, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      user: userResult.rows[0],
      binaryNode: { id: nodeId, position },
      message: `User ${fullName} created successfully at ${position} position`,
    });
  } catch (error: any) {
    console.error('❌ [Admin] Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user details
 */
router.put('/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      role,
      wallet_balance,
      current_rank,
      kyc_status,
      is_active
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (wallet_balance !== undefined) {
      updates.push('wallet_balance = ?');
      values.push(wallet_balance);
    }
    if (current_rank !== undefined) {
      updates.push('current_rank = ?');
      values.push(current_rank);
    }
    if (kyc_status !== undefined) {
      updates.push('kyc_status = ?');
      values.push(kyc_status);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`✅ Admin updated user ${id}`);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (soft delete)
 */
router.delete('/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?', [id]);

    console.log(`✅ Admin deleted user ${id}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password
 */
router.post('/users/:id/reset-password', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );

    console.log(`✅ Admin reset password for user ${id}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================================
// PACKAGE MANAGEMENT ENDPOINTS
// ============================================================

/**
 * GET /api/admin/packages
 * Get all packages
 */
router.get('/packages', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM packages ORDER BY min_investment ASC');

    res.json({ packages: result.rows });
  } catch (error: any) {
    console.error('❌ Get packages error:', error);
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

/**
 * POST /api/admin/packages
 * Create new package
 */
router.post('/packages', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      min_investment,
      max_investment,
      daily_roi_percentage,
      duration_days,
      level_income_percentages,
      matching_bonus_percentage,
      is_active
    } = req.body;

    // Validation
    if (!name || !min_investment || !max_investment || !daily_roi_percentage || !duration_days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await query(
      `INSERT INTO packages
       (name, min_investment, max_investment, daily_roi_percentage, duration_days,
        level_income_percentages, matching_bonus_percentage, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name,
        min_investment,
        max_investment,
        daily_roi_percentage,
        duration_days,
        JSON.stringify(level_income_percentages || []),
        matching_bonus_percentage || 0,
        is_active !== false ? 1 : 0
      ]
    );

    console.log(`✅ Admin created package: ${name}`);
    res.json({ success: true, message: 'Package created successfully' });
  } catch (error: any) {
    console.error('❌ Create package error:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

/**
 * PUT /api/admin/packages/:id
 * Update package
 */
router.put('/packages/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      min_investment,
      max_investment,
      daily_roi_percentage,
      duration_days,
      level_income_percentages,
      matching_bonus_percentage,
      is_active
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (min_investment !== undefined) {
      updates.push('min_investment = ?');
      values.push(min_investment);
    }
    if (max_investment !== undefined) {
      updates.push('max_investment = ?');
      values.push(max_investment);
    }
    if (daily_roi_percentage !== undefined) {
      updates.push('daily_roi_percentage = ?');
      values.push(daily_roi_percentage);
    }
    if (duration_days !== undefined) {
      updates.push('duration_days = ?');
      values.push(duration_days);
    }
    if (level_income_percentages !== undefined) {
      updates.push('level_income_percentages = ?');
      values.push(JSON.stringify(level_income_percentages));
    }
    if (matching_bonus_percentage !== undefined) {
      updates.push('matching_bonus_percentage = ?');
      values.push(matching_bonus_percentage);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE packages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`✅ Admin updated package ${id}`);
    res.json({ success: true, message: 'Package updated successfully' });
  } catch (error: any) {
    console.error('❌ Update package error:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

/**
 * DELETE /api/admin/packages/:id
 * Delete package (set inactive)
 */
router.delete('/packages/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('UPDATE packages SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);

    console.log(`✅ Admin deleted package ${id}`);
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ============================================================
// TRANSACTION & COMMISSION ENDPOINTS
// ============================================================

/**
 * GET /api/admin/transactions
 * Get all transactions with pagination
 */
router.get('/transactions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const type = req.query.type as string || '';
    const status = req.query.status as string || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (type) {
      whereClause += ' AND transaction_type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM mlm_transactions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    const transactionsResult = await query(
      `SELECT t.*, u.email, u.full_name
       FROM mlm_transactions t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      transactions: transactionsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * GET /api/admin/commissions
 * Get all commissions with pagination
 */
router.get('/commissions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) as total FROM commissions');
    const total = parseInt(countResult.rows[0]?.total || 0);

    const commissionsResult = await query(
      `SELECT c.*,
       u1.email as user_email, u1.full_name as user_name,
       u2.email as from_user_email, u2.full_name as from_user_name,
       p.name as package_name
       FROM commissions c
       JOIN users u1 ON c.user_id = u1.id
       LEFT JOIN users u2 ON c.from_user_id = u2.id
       LEFT JOIN packages p ON c.package_id = p.id
       ORDER BY c.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    res.json({
      commissions: commissionsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ Get commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// ============================================================
// ANALYTICS & REPORTING ENDPOINTS
// ============================================================

/**
 * GET /api/admin/analytics/overview
 * Get system overview statistics
 */
router.get('/analytics/overview', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Total users and registrations
    const usersResult = await query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active FROM users');

    const todayRegistrations = await query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );

    const weekRegistrations = await query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    const monthRegistrations = await query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    // Total investments and earnings
    const investmentsResult = await query('SELECT COALESCE(SUM(total_investment), 0) as total FROM users');
    const earningsResult = await query('SELECT COALESCE(SUM(total_earnings), 0) as total FROM users');
    const roiEarningsResult = await query('SELECT COALESCE(SUM(roi_on_roi_earnings), 0) as total FROM users');
    const commissionEarningsResult = await query('SELECT COALESCE(SUM(booster_earnings + reward_earnings), 0) as total FROM users');

    // Package metrics
    const activePackagesResult = await query('SELECT COUNT(*) as total FROM user_packages WHERE status = "active"');
    const totalPackagesSoldResult = await query('SELECT COUNT(*) as total FROM user_packages');

    // Financial metrics - Withdrawals (safe query, table may not exist)
    let withdrawalsResult = { rows: [{ pending: 0, pending_amount: 0 }] };
    try {
      withdrawalsResult = await query(
        'SELECT COUNT(*) as pending, COALESCE(SUM(CASE WHEN status = "pending" THEN requested_amount ELSE 0 END), 0) as pending_amount FROM withdrawals'
      );
    } catch (error) {
      // Withdrawals table doesn't exist yet, use defaults
    }

    // KYC metrics (safe query, table may not exist)
    let kycResult = { rows: [{ pending: 0, approved: 0 }] };
    try {
      kycResult = await query(
        'SELECT SUM(CASE WHEN status = "PENDING" THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status = "APPROVED" THEN 1 ELSE 0 END) as approved FROM kyc'
      );
    } catch (error) {
      // KYC table doesn't exist yet, use defaults
    }

    // Commission breakdown
    const commissionsResult = await query(
      'SELECT SUM(amount) as total FROM mlm_transactions WHERE transaction_type IN ("level_income", "matching_bonus", "binary_bonus")'
    );

    // Binary earnings - calculate from mlm_transactions
    const binaryResult = await query('SELECT COALESCE(SUM(amount), 0) as total FROM mlm_transactions WHERE transaction_type = "binary_bonus"');

    res.json({
      // User metrics
      total_users: parseInt(usersResult.rows[0]?.total || 0),
      active_users: parseInt(usersResult.rows[0]?.active || 0),
      today_registrations: parseInt(todayRegistrations.rows[0]?.count || 0),
      week_registrations: parseInt(weekRegistrations.rows[0]?.count || 0),
      month_registrations: parseInt(monthRegistrations.rows[0]?.count || 0),

      // Financial metrics
      total_revenue: parseFloat(investmentsResult.rows[0]?.total || 0),
      total_investments: parseFloat(investmentsResult.rows[0]?.total || 0),
      total_withdrawals: 0, // TODO: Implement when withdrawal_requests table is available
      pending_withdrawals: parseInt(withdrawalsResult.rows[0]?.pending || 0),
      pending_withdrawals_amount: parseFloat(withdrawalsResult.rows[0]?.pending_amount || 0),

      // Package metrics
      active_packages: parseInt(activePackagesResult.rows[0]?.total || 0),
      total_packages_sold: parseInt(totalPackagesSoldResult.rows[0]?.total || 0),

      // KYC metrics
      pending_kyc: parseInt(kycResult.rows[0]?.pending || 0),
      approved_kyc: parseInt(kycResult.rows[0]?.approved || 0),

      // Commission metrics
      total_commissions_paid: parseFloat(commissionsResult.rows[0]?.total || 0),
      pending_commissions: 0, // Commissions are paid instantly in this system
      total_roi_distributed: parseFloat(roiEarningsResult.rows[0]?.total || 0),
      total_binary_earnings: parseFloat(binaryResult.rows[0]?.total || 0),

      // Earnings breakdown
      total_earnings: parseFloat(earningsResult.rows[0]?.total || 0),
      roi_earnings: parseFloat(roiEarningsResult.rows[0]?.total || 0),
      commission_earnings: parseFloat(commissionEarningsResult.rows[0]?.total || 0),

      // Robot subscriptions (not implemented yet)
      active_robot_subscriptions: 0
    });
  } catch (error: any) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/admin/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const dailyRevenueResult = await query(
      `SELECT DATE(created_at) as date, SUM(amount) as revenue
       FROM mlm_transactions
       WHERE transaction_type = 'package_purchase'
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    const commissionPaidResult = await query(
      `SELECT DATE(created_at) as date, SUM(amount) as commissions
       FROM mlm_transactions
       WHERE transaction_type IN ('level_income', 'matching_bonus', 'binary_bonus')
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    const roiPaidResult = await query(
      `SELECT DATE(created_at) as date, SUM(amount) as roi
       FROM mlm_transactions
       WHERE transaction_type = 'roi_distribution'
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    res.json({
      daily_revenue: dailyRevenueResult.rows,
      commissions_paid: commissionPaidResult.rows,
      roi_paid: roiPaidResult.rows
    });
  } catch (error: any) {
    console.error('❌ Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

// ============================================================
// SYSTEM OPERATIONS
// ============================================================

/**
 * POST /api/admin/distribute-roi
 * Manual ROI distribution trigger
 */
router.post('/distribute-roi', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual ROI distribution triggered by admin');
    const result = await distributeROI();
    res.json({
      success: true,
      message: 'ROI distribution completed successfully',
      ...result
    });
  } catch (error: any) {
    console.error('❌ Manual ROI distribution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to distribute ROI',
      message: error.message
    });
  }
});

export default router;
