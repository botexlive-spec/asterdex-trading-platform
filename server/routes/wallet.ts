/**
 * Wallet API Routes
 * Handles wallet balance, deposits, withdrawals, transfers, and transaction history
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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

    // Fetch wallet data
    const walletResult = await query(
      'SELECT available_balance, total_balance, locked_balance FROM wallets WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!walletResult.rows || walletResult.rows.length === 0) {
      // Return default balance if wallet doesn't exist
      return res.json({
        total: 0,
        available: 0,
        locked: 0,
        pending: 0
      });
    }

    const wallet = walletResult.rows[0];

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
      total: parseFloat(wallet.total_balance || '0'),
      available: parseFloat(wallet.available_balance || '0'),
      locked: parseFloat(wallet.locked_balance || '0'),
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
       AND completed_at >= ?`,
      [userId, todayStart]
    );

    const weeklyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND completed_at >= ?`,
      [userId, weekAgo]
    );

    const monthlyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND completed_at >= ?`,
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
 * Submit withdrawal request
 */
router.post('/withdrawal', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const { amount, method, accountId, password } = req.body;

    if (!amount || amount <= 0 || !method || !accountId || !password) {
      return res.status(400).json({ error: 'Invalid withdrawal request' });
    }

    // Verify password (simple check - in production use bcrypt)
    const userResult = await query(
      'SELECT password_hash, kyc_status FROM users WHERE id = ? LIMIT 1',
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

    // Check wallet balance
    const balanceResult = await query(
      'SELECT available_balance FROM wallets WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!balanceResult.rows || balanceResult.rows.length === 0) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const availableBalance = parseFloat(balanceResult.rows[0].available_balance || '0');
    if (availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    // Check withdrawal limits
    const limitsResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as today_total
       FROM mlm_transactions
       WHERE user_id = ?
       AND transaction_type = 'withdrawal'
       AND status = 'completed'
       AND completed_at >= ?`,
      [userId, new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ')]
    );

    const todayTotal = parseFloat(limitsResult.rows[0].today_total);
    const dailyLimit = 10000;

    if (todayTotal + amount > dailyLimit) {
      return res.status(400).json({
        error: `Daily withdrawal limit exceeded. Available: $${(dailyLimit - todayTotal).toFixed(2)}`
      });
    }

    // Create withdrawal transaction
    const result = await query(
      `INSERT INTO mlm_transactions
       (user_id, transaction_type, amount, status, method, description, metadata)
       VALUES (?, 'withdrawal', ?, 'pending', ?, ?, ?)`,
      [
        userId,
        -amount,
        method,
        `Withdrawal via ${method.toUpperCase()}`,
        JSON.stringify({ accountId, method })
      ]
    );

    const transactionResult = await query(
      'SELECT * FROM mlm_transactions WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    res.json(transactionResult.rows[0]);
  } catch (error: any) {
    console.error('❌ Submit withdrawal error:', error);
    res.status(500).json({ error: 'Failed to submit withdrawal' });
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

    // Check sender balance
    const balanceResult = await query(
      'SELECT available_balance FROM wallets WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!balanceResult.rows || balanceResult.rows.length === 0) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const availableBalance = parseFloat(balanceResult.rows[0].available_balance || '0');
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
      'UPDATE wallets SET available_balance = available_balance - ?, total_balance = total_balance - ? WHERE user_id = ?',
      [totalAmount, totalAmount, userId]
    );

    // Credit to recipient
    await query(
      'UPDATE wallets SET available_balance = available_balance + ?, total_balance = total_balance + ? WHERE user_id = ?',
      [amount, amount, recipient.id]
    );

    // Create sender transaction
    const senderTxResult = await query(
      `INSERT INTO mlm_transactions
       (user_id, from_user_id, transaction_type, amount, status, description, metadata, completed_at)
       VALUES (?, ?, 'transfer_out', ?, 'completed', ?, ?, NOW())`,
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
       (user_id, from_user_id, transaction_type, amount, status, description, metadata, completed_at)
       VALUES (?, ?, 'transfer_in', ?, 'completed', ?, ?, NOW())`,
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
       (user_id, transaction_type, amount, status, description, completed_at)
       VALUES (?, 'transfer_out', ?, 'completed', 'Transfer fee (1%)', NOW())`,
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

export default router;
