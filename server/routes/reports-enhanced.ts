/**
 * Enhanced Reports API
 * Paginated reports for ROI, Level Income, Binary, Boosters, Withdrawals
 * Includes CSV export functionality
 */

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_jwt_secret_key_change_in_production_2024';

/**
 * Middleware to verify JWT token and admin role
 */
function authenticateAdmin(req: Request, res: Response, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

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

router.use(authenticateAdmin);

/**
 * GET /api/reports-enhanced/roi
 * ROI Distribution Report with pagination
 */
router.get('/roi', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const userId = req.query.userId as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause += ' AND p.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (userId) {
      whereClause += ' AND p.user_id = ?';
      params.push(userId);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM payouts p ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get paginated data
    const result = await query(
      `SELECT
        p.id,
        p.user_id,
        u.email,
        u.full_name,
        p.payout_type,
        p.amount,
        p.status,
        p.reference_id,
        p.reference_type,
        p.created_at
      FROM payouts p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      AND p.payout_type = 'roi'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate summary
    const summaryResult = await query(
      `SELECT
        COUNT(*) as total_payouts,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payouts p
      ${whereClause}
      AND p.payout_type = 'roi'`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name || 'Unknown',
        payout_type: row.payout_type,
        amount: parseFloat(row.amount),
        status: row.status,
        reference_id: row.reference_id,
        reference_type: row.reference_type,
        created_at: row.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total_payouts: summaryResult.rows[0]?.total_payouts || 0,
        total_amount: parseFloat(summaryResult.rows[0]?.total_amount || 0),
        avg_amount: parseFloat(summaryResult.rows[0]?.avg_amount || 0),
      },
    });
  } catch (error: any) {
    console.error('❌ ROI Report Error:', error);
    res.status(500).json({ error: 'Failed to generate ROI report' });
  }
});

/**
 * GET /api/reports-enhanced/level-income
 * Level Income Report with pagination
 */
router.get('/level-income', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const userId = req.query.userId as string;
    const level = req.query.level as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause += ' AND p.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (userId) {
      whereClause += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (level) {
      whereClause += ' AND p.level = ?';
      params.push(parseInt(level));
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM payouts p ${whereClause} AND p.payout_type = 'level_income'`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get paginated data
    const result = await query(
      `SELECT
        p.id,
        p.user_id,
        u.email as user_email,
        u.full_name as user_name,
        p.from_user_id,
        fu.email as from_user_email,
        fu.full_name as from_user_name,
        p.level,
        p.amount,
        p.status,
        p.reference_id,
        p.created_at
      FROM payouts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN users fu ON p.from_user_id = fu.id
      ${whereClause}
      AND p.payout_type = 'level_income'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate summary by level
    const summaryResult = await query(
      `SELECT
        p.level,
        COUNT(*) as count,
        SUM(p.amount) as total_amount
      FROM payouts p
      ${whereClause}
      AND p.payout_type = 'level_income'
      GROUP BY p.level
      ORDER BY p.level ASC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_email: row.user_email,
        user_name: row.user_name || 'Unknown',
        from_user_id: row.from_user_id,
        from_user_email: row.from_user_email,
        from_user_name: row.from_user_name || 'Unknown',
        level: row.level,
        amount: parseFloat(row.amount),
        status: row.status,
        reference_id: row.reference_id,
        created_at: row.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        by_level: summaryResult.rows.map((row: any) => ({
          level: row.level,
          count: row.count,
          total_amount: parseFloat(row.total_amount),
        })),
      },
    });
  } catch (error: any) {
    console.error('❌ Level Income Report Error:', error);
    res.status(500).json({ error: 'Failed to generate level income report' });
  }
});

/**
 * GET /api/reports-enhanced/binary
 * Binary Matching Report with pagination
 */
router.get('/binary', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const userId = req.query.userId as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause += ' AND p.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (userId) {
      whereClause += ' AND p.user_id = ?';
      params.push(userId);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM payouts p ${whereClause} AND p.payout_type = 'binary_matching'`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get paginated data
    const result = await query(
      `SELECT
        p.id,
        p.user_id,
        u.email,
        u.full_name,
        u.left_volume,
        u.right_volume,
        p.amount,
        p.status,
        p.created_at
      FROM payouts p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      AND p.payout_type = 'binary_matching'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate summary
    const summaryResult = await query(
      `SELECT
        COUNT(*) as total_payouts,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payouts p
      ${whereClause}
      AND p.payout_type = 'binary_matching'`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name || 'Unknown',
        left_volume: parseFloat(row.left_volume || 0),
        right_volume: parseFloat(row.right_volume || 0),
        amount: parseFloat(row.amount),
        status: row.status,
        created_at: row.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total_payouts: summaryResult.rows[0]?.total_payouts || 0,
        total_amount: parseFloat(summaryResult.rows[0]?.total_amount || 0),
        avg_amount: parseFloat(summaryResult.rows[0]?.avg_amount || 0),
      },
    });
  } catch (error: any) {
    console.error('❌ Binary Report Error:', error);
    res.status(500).json({ error: 'Failed to generate binary report' });
  }
});

/**
 * GET /api/reports-enhanced/boosters
 * Booster Report with pagination
 */
router.get('/boosters', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM boosters b ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get paginated data
    const result = await query(
      `SELECT
        b.id,
        b.user_id,
        u.email,
        u.full_name,
        b.start_date,
        b.end_date,
        b.direct_count,
        b.target_directs,
        b.bonus_roi_percentage,
        b.status,
        b.created_at
      FROM boosters b
      LEFT JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate summary
    const summaryResult = await query(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(direct_count) as avg_directs
      FROM boosters b
      ${whereClause}
      GROUP BY status`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name || 'Unknown',
        start_date: row.start_date,
        end_date: row.end_date,
        direct_count: row.direct_count,
        target_directs: row.target_directs,
        bonus_roi_percentage: parseFloat(row.bonus_roi_percentage),
        status: row.status,
        created_at: row.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        by_status: summaryResult.rows.map((row: any) => ({
          status: row.status,
          count: row.count,
          avg_directs: parseFloat(row.avg_directs || 0),
        })),
      },
    });
  } catch (error: any) {
    console.error('❌ Boosters Report Error:', error);
    res.status(500).json({ error: 'Failed to generate boosters report' });
  }
});

/**
 * GET /api/reports-enhanced/withdrawals
 * Withdrawals Report with pagination
 */
router.get('/withdrawals', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause += ' AND w.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (status) {
      whereClause += ' AND w.status = ?';
      params.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM withdrawals w ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get paginated data
    const result = await query(
      `SELECT
        w.id,
        w.user_id,
        u.email,
        u.full_name,
        w.amount,
        w.fee,
        w.net_amount,
        w.wallet_address,
        w.status,
        w.rejection_reason,
        w.created_at,
        w.updated_at
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      ${whereClause}
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate summary
    const summaryResult = await query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fee) as total_fees,
        SUM(net_amount) as total_net
      FROM withdrawals w
      ${whereClause}
      GROUP BY status`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name || 'Unknown',
        amount: parseFloat(row.amount),
        fee: parseFloat(row.fee || 0),
        net_amount: parseFloat(row.net_amount),
        wallet_address: row.wallet_address,
        status: row.status,
        rejection_reason: row.rejection_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        by_status: summaryResult.rows.map((row: any) => ({
          status: row.status,
          count: row.count,
          total_amount: parseFloat(row.total_amount || 0),
          total_fees: parseFloat(row.total_fees || 0),
          total_net: parseFloat(row.total_net || 0),
        })),
      },
    });
  } catch (error: any) {
    console.error('❌ Withdrawals Report Error:', error);
    res.status(500).json({ error: 'Failed to generate withdrawals report' });
  }
});

/**
 * GET /api/reports-enhanced/export/:reportType
 * Export report as CSV
 */
router.get('/export/:reportType', async (req: Request, res: Response) => {
  try {
    const { reportType } = req.params;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const userId = req.query.userId as string;

    let data: any[] = [];
    let headers: string[] = [];
    let filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    // Build query based on report type
    switch (reportType) {
      case 'roi':
        const roiResult = await query(
          `SELECT
            p.id,
            u.email,
            u.full_name,
            p.amount,
            p.status,
            p.created_at
          FROM payouts p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.payout_type = 'roi'
          ${startDate && endDate ? 'AND p.created_at BETWEEN ? AND ?' : ''}
          ORDER BY p.created_at DESC`,
          startDate && endDate ? [startDate, endDate] : []
        );
        data = roiResult.rows;
        headers = ['ID', 'Email', 'Full Name', 'Amount', 'Status', 'Created At'];
        break;

      case 'level-income':
        const levelResult = await query(
          `SELECT
            p.id,
            u.email as user_email,
            u.full_name as user_name,
            fu.email as from_email,
            p.level,
            p.amount,
            p.status,
            p.created_at
          FROM payouts p
          LEFT JOIN users u ON p.user_id = u.id
          LEFT JOIN users fu ON p.from_user_id = fu.id
          WHERE p.payout_type = 'level_income'
          ${startDate && endDate ? 'AND p.created_at BETWEEN ? AND ?' : ''}
          ORDER BY p.created_at DESC`,
          startDate && endDate ? [startDate, endDate] : []
        );
        data = levelResult.rows;
        headers = ['ID', 'User Email', 'User Name', 'From Email', 'Level', 'Amount', 'Status', 'Created At'];
        break;

      case 'binary':
        const binaryResult = await query(
          `SELECT
            p.id,
            u.email,
            u.full_name,
            u.left_volume,
            u.right_volume,
            p.amount,
            p.status,
            p.created_at
          FROM payouts p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.payout_type = 'binary_matching'
          ${startDate && endDate ? 'AND p.created_at BETWEEN ? AND ?' : ''}
          ORDER BY p.created_at DESC`,
          startDate && endDate ? [startDate, endDate] : []
        );
        data = binaryResult.rows;
        headers = ['ID', 'Email', 'Full Name', 'Left Volume', 'Right Volume', 'Amount', 'Status', 'Created At'];
        break;

      case 'boosters':
        const boostersResult = await query(
          `SELECT
            b.id,
            u.email,
            u.full_name,
            b.start_date,
            b.end_date,
            b.direct_count,
            b.target_directs,
            b.bonus_roi_percentage,
            b.status,
            b.created_at
          FROM boosters b
          LEFT JOIN users u ON b.user_id = u.id
          ORDER BY b.created_at DESC`
        );
        data = boostersResult.rows;
        headers = ['ID', 'Email', 'Full Name', 'Start Date', 'End Date', 'Direct Count', 'Target', 'Bonus %', 'Status', 'Created At'];
        break;

      case 'withdrawals':
        const withdrawalsResult = await query(
          `SELECT
            w.id,
            u.email,
            u.full_name,
            w.amount,
            w.fee,
            w.net_amount,
            w.wallet_address,
            w.status,
            w.created_at
          FROM withdrawals w
          LEFT JOIN users u ON w.user_id = u.id
          ${startDate && endDate ? 'WHERE w.created_at BETWEEN ? AND ?' : ''}
          ORDER BY w.created_at DESC`,
          startDate && endDate ? [startDate, endDate] : []
        );
        data = withdrawalsResult.rows;
        headers = ['ID', 'Email', 'Full Name', 'Amount', 'Fee', 'Net Amount', 'Wallet Address', 'Status', 'Created At'];
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    data.forEach((row: any) => {
      const values = Object.values(row).map((val: any) => {
        // Escape quotes and wrap in quotes if contains comma
        const str = String(val || '');
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    console.error('❌ Export Error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;
