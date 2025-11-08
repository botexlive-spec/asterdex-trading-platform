/**
 * Wallet API Routes
 * Handles wallet balance, deposits, withdrawals, transfers, and transaction history
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import {
  createWithdrawalRequest,
  approveWithdrawal,
  rejectWithdrawal,
  getUserWithdrawals,
  getAllPendingWithdrawals
} from '../services/withdrawal.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finaster_mlm_jwt_secret_key_change_in_production_2024';

// Authentication middleware
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

// Admin authentication middleware
function authenticateAdmin(req: Request, res: Response, next: any) {
  const user = (req as any).user;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}

// Apply authentication to all wallet routes
router.use(authenticateToken);

/**
 * GET /api/wallet/balance
 * Get user's wallet balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Fetch wallet balance from users table
    const userResult = await query(
      'SELECT wallet_balance FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      // Return default balance if user doesn't exist
      return res.json({
        total: 0,
        available: 0,
        locked: 0,
        pending: 0
      });
    }

    const walletBalance = parseFloat(userResult.rows[0].wallet_balance || '0');

    // Calculate pending balance from pending transactions
    const pendingResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as pending_amount
       FROM mlm_transactions
       WHERE user_id = ?
       AND status = 'pending'
       AND transaction_type IN ('deposit', 'withdrawal')`,
      [userId]
    );

    const pendingAmount = parseFloat(pendingResult.rows[0]?.pending_amount || '0');

    res.json({
      total: walletBalance,
      available: walletBalance,
      locked: 0,
      pending: pendingAmount
    });
  } catch (error: any) {
    console.error('❌ Get wallet balance error:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
});

/**
 * POST /api/wallet/deposit/address
 * Generate crypto deposit address
 */
router.post('/deposit/address', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { crypto, network } = req.body;

    if (!crypto || !network) {
      return res.status(400).json({ error: 'Crypto and network are required' });
    }

    // Generate deterministic address based on user ID
    const addresses: Record<string, Record<string, string>> = {
      'BTC': {
        'Bitcoin': `bc1q${userId.substring(0, 39)}`,
        'Lightning': `lnbc1q${userId.substring(0, 38)}`
      },
      'ETH': {
        'Ethereum': `0x${userId.replace(/-/g, '').substring(0, 40)}`,
        'BSC': `0x${userId.replace(/-/g, '').substring(0, 40)}`,
        'Polygon': `0x${userId.replace(/-/g, '').substring(0, 40)}`
      },
      'USDT': {
        'ERC20': `0x${userId.replace(/-/g, '').substring(0, 40)}`,
        'TRC20': `T${userId.replace(/-/g, '').substring(0, 33)}`,
        'BSC': `0x${userId.replace(/-/g, '').substring(0, 40)}`
      },
      'USDC': {
        'ERC20': `0x${userId.replace(/-/g, '').substring(0, 40)}`,
        'Polygon': `0x${userId.replace(/-/g, '').substring(0, 40)}`
      }
    };

    const address = addresses[crypto]?.[network];
    if (!address) {
      return res.status(400).json({ error: 'Unsupported crypto/network combination' });
    }

    const minDeposits: Record<string, number> = {
      'BTC': 0.0001,
      'ETH': 0.001,
      'USDT': 10,
      'USDC': 10
    };

    const confirmations: Record<string, number> = {
      'BTC': 3,
      'ETH': 12,
      'USDT': 12,
      'USDC': 12
    };

    res.json({
      address,
      network,
      qrCode: address,
      minDeposit: minDeposits[crypto] || 10,
      confirmations: confirmations[crypto] || 12
    });
  } catch (error: any) {
    console.error('❌ Generate deposit address error:', error);
    res.status(500).json({ error: 'Failed to generate deposit address' });
  }
});

/**
 * POST /api/wallet/deposit
 * Submit deposit request
 */
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { method, amount, crypto, network, transactionId, referenceNumber, utrNumber } = req.body;

    if (!method || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit request' });
    }

    // Create metadata
    const metadata: any = { method };

    if (method === 'crypto') {
      metadata.crypto = crypto;
      metadata.network = network;
      metadata.transactionId = transactionId;
    } else if (method === 'bank') {
      metadata.referenceNumber = referenceNumber;
    } else if (method === 'upi') {
      metadata.utrNumber = utrNumber;
    }

    // Create deposit transaction
    const result = await query(
      `INSERT INTO mlm_transactions
       (user_id, transaction_type, amount, status, method, description, metadata)
       VALUES (?, 'deposit', ?, 'pending', ?, ?, ?)`,
      [
        userId,
        amount,
        method,
        `Deposit via ${method.toUpperCase()}`,
        JSON.stringify(metadata)
      ]
    );

    // Fetch the created transaction
    const transactionResult = await query(
      'SELECT * FROM mlm_transactions WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    res.json(transactionResult.rows[0]);
  } catch (error: any) {
    console.error('❌ Submit deposit error:', error);
    res.status(500).json({ error: 'Failed to submit deposit' });
  }
});

/**
 * GET /api/wallet/withdrawal/limits
 * Get withdrawal limits and usage
 */
router.get('/withdrawal/limits', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // Get completed withdrawals for each period
    const dailyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND created_at >= ?`,
      [userId, todayStart]
    );

    const weeklyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND created_at >= ?`,
      [userId, weekAgo]
    );

    const monthlyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND created_at >= ?`,
      [userId, monthAgo]
    );

    res.json({
      daily: { limit: 10000, used: parseFloat(dailyResult.rows[0].total) },
      weekly: { limit: 50000, used: parseFloat(weeklyResult.rows[0].total) },
      monthly: { limit: 200000, used: parseFloat(monthlyResult.rows[0].total) }
    });
  } catch (error: any) {
    console.error('❌ Get withdrawal limits error:', error);
    res.status(500).json({ error: 'Failed to get withdrawal limits' });
  }
});

/**
 * POST /api/wallet/withdrawal
 * Submit withdrawal request with time-based deductions
 */
router.post('/withdrawal', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, method, wallet_address, account_details, password, withdrawal_type } = req.body;

    if (!amount || amount <= 0 || !method || !password) {
      return res.status(400).json({ error: 'Invalid withdrawal request' });
    }

    // Verify password (simple check - in production use bcrypt)
    const userResult = await query(
      'SELECT password_hash, kyc_status, wallet_balance FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check KYC status
    if (user.kyc_status !== 'approved') {
      return res.status(403).json({ error: 'KYC approval required for withdrawals' });
    }

    // Check available balance
    const availableBalance = parseFloat(user.wallet_balance || '0');
    if (availableBalance < amount) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        available: availableBalance
      });
    }

    // Create withdrawal request with deduction calculation
    const withdrawal = await createWithdrawalRequest(
      userId,
      amount,
      withdrawal_type || 'earnings',
      method,
      wallet_address,
      account_details
    );

    console.log(`✅ Withdrawal request created for user ${userId}: ${withdrawal.request_amount} (final: ${withdrawal.final_amount} after ${withdrawal.deduction_percentage}% deduction)`);

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        request_amount: withdrawal.request_amount,
        deduction_percentage: withdrawal.deduction_percentage,
        deduction_amount: withdrawal.deduction_amount,
        final_amount: withdrawal.final_amount,
        days_held: withdrawal.days_held,
        status: withdrawal.status,
        withdrawal_type: withdrawal.withdrawal_type,
        method: withdrawal.method,
        created_at: withdrawal.created_at
      }
    });
  } catch (error: any) {
    console.error('❌ Submit withdrawal error:', error);
    res.status(500).json({
      error: error.message || 'Failed to submit withdrawal request'
    });
  }
});

/**
 * POST /api/wallet/transfer
 * Transfer funds to another user
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const { recipientId, amount, note, password } = req.body;

    if (!recipientId || !amount || amount <= 0 || !password) {
      return res.status(400).json({ error: 'Invalid transfer request' });
    }

    // Find recipient by ID or email
    const recipientResult = await query(
      'SELECT id, email, full_name FROM users WHERE id = ? OR email = ? LIMIT 1',
      [recipientId, recipientId]
    );

    if (!recipientResult.rows || recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const recipient = recipientResult.rows[0];

    if (recipient.id === userId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    // Check sender balance from users table
    const balanceResult = await query(
      'SELECT wallet_balance FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!balanceResult.rows || balanceResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const availableBalance = parseFloat(balanceResult.rows[0].wallet_balance || '0');
    const fee = amount * 0.01; // 1% transfer fee
    const totalAmount = amount + fee;

    if (availableBalance < totalAmount) {
      return res.status(400).json({
        error: `Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`
      });
    }

    // Begin transaction (manual transaction simulation)
    // Deduct from sender
    await query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
      [totalAmount, userId]
    );

    // Credit to recipient
    await query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [amount, recipient.id]
    );

    // Create sender transaction
    const senderTxResult = await query(
      `INSERT INTO mlm_transactions
       (user_id, from_user_id, transaction_type, amount, status, description, metadata)
       VALUES (?, ?, 'transfer_out', ?, 'completed', ?, ?)`,
      [
        userId,
        userId,
        -totalAmount,
        `Transfer to ${recipient.full_name || recipient.email}`,
        JSON.stringify({ recipientId: recipient.id, transferAmount: amount, fee, note })
      ]
    );

    // Create recipient transaction
    await query(
      `INSERT INTO mlm_transactions
       (user_id, from_user_id, transaction_type, amount, status, description, metadata)
       VALUES (?, ?, 'transfer_in', ?, 'completed', ?, ?)`,
      [
        recipient.id,
        userId,
        amount,
        `Transfer from ${userEmail}`,
        JSON.stringify({ senderId: userId, note })
      ]
    );

    // Create fee transaction
    await query(
      `INSERT INTO mlm_transactions
       (user_id, transaction_type, amount, status, description)
       VALUES (?, 'transfer_out', ?, 'completed', 'Transfer fee (1%)')`,
      [userId, -fee]
    );

    const transactionResult = await query(
      'SELECT * FROM mlm_transactions WHERE id = ? LIMIT 1',
      [senderTxResult.insertId]
    );

    res.json({
      transaction: transactionResult.rows[0],
      recipientName: recipient.full_name || recipient.email
    });
  } catch (error: any) {
    console.error('❌ Transfer funds error:', error);
    res.status(500).json({ error: 'Failed to transfer funds' });
  }
});

/**
 * GET /api/wallet/transactions/pending
 * Get pending deposits/withdrawals
 */
router.get('/transactions/pending', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await query(
      `SELECT * FROM mlm_transactions
       WHERE user_id = ?
       AND status = 'pending'
       AND transaction_type IN ('deposit', 'withdrawal')
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows || []);
  } catch (error: any) {
    console.error('❌ Get pending transactions error:', error);
    res.status(500).json({ error: 'Failed to get pending transactions' });
  }
});

/**
 * GET /api/wallet/withdrawals
 * Get user's withdrawal history
 */
router.get('/withdrawals', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status, limit = 50 } = req.query;

    const withdrawals = await getUserWithdrawals(userId, status as string, parseInt(limit as string));

    res.json({
      success: true,
      withdrawals,
      count: withdrawals.length
    });
  } catch (error: any) {
    console.error('❌ Get user withdrawals error:', error);
    res.status(500).json({ error: 'Failed to get withdrawal history' });
  }
});

/**
 * GET /api/wallet/withdrawals/pending
 * Get all pending withdrawals (admin only)
 */
router.get('/withdrawals/pending', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    const withdrawals = await getAllPendingWithdrawals(parseInt(limit as string));

    res.json({
      success: true,
      withdrawals,
      count: withdrawals.length
    });
  } catch (error: any) {
    console.error('❌ Get pending withdrawals error:', error);
    res.status(500).json({ error: 'Failed to get pending withdrawals' });
  }
});

/**
 * POST /api/wallet/withdrawals/:id/approve
 * Approve withdrawal request (admin only)
 */
router.post('/withdrawals/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id);
    const adminId = (req as any).user.id;
    const { notes } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: 'Invalid withdrawal ID' });
    }

    const withdrawal = await approveWithdrawal(withdrawalId, adminId, notes);

    console.log(`✅ Withdrawal ${withdrawalId} approved by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal: {
        id: withdrawal.id,
        user_id: withdrawal.user_id,
        request_amount: withdrawal.request_amount,
        final_amount: withdrawal.final_amount,
        status: withdrawal.status,
        approved_at: withdrawal.approved_at,
        approved_by: withdrawal.approved_by
      }
    });
  } catch (error: any) {
    console.error('❌ Approve withdrawal error:', error);
    res.status(500).json({
      error: error.message || 'Failed to approve withdrawal'
    });
  }
});

/**
 * POST /api/wallet/withdrawals/:id/reject
 * Reject withdrawal request (admin only)
 */
router.post('/withdrawals/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id);
    const adminId = (req as any).user.id;
    const { reason, notes } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: 'Invalid withdrawal ID' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const withdrawal = await rejectWithdrawal(withdrawalId, adminId, reason, notes);

    console.log(`✅ Withdrawal ${withdrawalId} rejected by admin ${adminId}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal: {
        id: withdrawal.id,
        user_id: withdrawal.user_id,
        request_amount: withdrawal.request_amount,
        status: withdrawal.status,
        rejection_reason: withdrawal.rejection_reason,
        rejected_at: withdrawal.rejected_at,
        rejected_by: withdrawal.rejected_by
      }
    });
  } catch (error: any) {
    console.error('❌ Reject withdrawal error:', error);
    res.status(500).json({
      error: error.message || 'Failed to reject withdrawal'
    });
  }
});

export default router;
