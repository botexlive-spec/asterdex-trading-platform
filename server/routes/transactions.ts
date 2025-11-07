/**
 * Transactions API Routes
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_mlm_jwt_secret_key_change_in_production_2024';

/**
 * GET /api/transactions
 * Get transaction history for authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string; // optional filter by transaction type

    // Build query with optional type filter
    let transactionQuery = `
      SELECT
        id,
        transaction_type,
        amount,
        from_user_id,
        level,
        package_id,
        description,
        status,
        created_at
      FROM mlm_transactions
      WHERE user_id = ?
    `;

    const queryParams: any[] = [decoded.id];

    if (type) {
      transactionQuery += ' AND transaction_type = ?';
      queryParams.push(type);
    }

    transactionQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const transactionsResult = await query(transactionQuery, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM mlm_transactions WHERE user_id = ?';
    const countParams: any[] = [decoded.id];

    if (type) {
      countQuery += ' AND transaction_type = ?';
      countParams.push(type);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get from_user details for transactions that have from_user_id
    const transactionsWithDetails = await Promise.all(
      transactionsResult.rows.map(async (tx: any) => {
        if (tx.from_user_id) {
          const userResult = await query(
            'SELECT full_name, email FROM users WHERE id = ? LIMIT 1',
            [tx.from_user_id]
          );
          return {
            ...tx,
            from_user: userResult.rows[0] || null,
          };
        }
        return { ...tx, from_user: null };
      })
    );

    res.json({
      transactions: transactionsWithDetails,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error: any) {
    console.error('❌ Transactions error:', error);
    res.status(500).json({ error: 'Failed to load transaction history' });
  }
});

export default router;
