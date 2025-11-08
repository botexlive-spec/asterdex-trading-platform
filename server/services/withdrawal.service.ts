/**
 * Withdrawal Service with Principal Deductions
 * Handles withdrawal requests with time-based deductions
 * Before 30 days: 15% deduction
 * After 30 days: 5% deduction
 */

import { query } from '../db';
import { getPrincipalWithdrawalConfig, isPlanActive } from './planSettings.service';

export interface WithdrawalRequest {
  id?: string;
  user_id: string;
  withdrawal_type: 'roi' | 'principal' | 'commission' | 'bonus';
  requested_amount: number;
  deduction_percentage: number;
  deduction_amount: number;
  final_amount: number;
  wallet_address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejection_reason?: string;
  investment_date?: Date;
  withdrawal_date?: Date;
  days_held?: number;
}

/**
 * Calculate deduction for principal withdrawal
 */
async function calculatePrincipalDeduction(
  userId: string,
  requestedAmount: number
): Promise<{
  deduction_percentage: number;
  deduction_amount: number;
  final_amount: number;
  days_held: number;
  investment_date: Date | null;
}> {
  try {
    // Get user's first investment date
    const userResult = await query(
      'SELECT first_investment_date FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].first_investment_date) {
      return {
        deduction_percentage: 0,
        deduction_amount: 0,
        final_amount: requestedAmount,
        days_held: 0,
        investment_date: null
      };
    }

    const investmentDate = new Date(userResult.rows[0].first_investment_date);
    const now = new Date();
    const daysHeld = Math.floor((now.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get withdrawal configuration
    const config = await getPrincipalWithdrawalConfig();
    if (!config) {
      throw new Error('Principal withdrawal configuration not found');
    }

    // Determine deduction percentage based on days held
    let deductionPercentage = 0;
    if (daysHeld < 30) {
      deductionPercentage = config.deduction_before_30_days; // 15%
    } else {
      deductionPercentage = config.deduction_after_30_days; // 5%
    }

    const deductionAmount = (requestedAmount * deductionPercentage) / 100;
    const finalAmount = requestedAmount - deductionAmount;

    return {
      deduction_percentage: deductionPercentage,
      deduction_amount: deductionAmount,
      final_amount: finalAmount,
      days_held: daysHeld,
      investment_date: investmentDate
    };
  } catch (error) {
    console.error('Error calculating principal deduction:', error);
    throw error;
  }
}

/**
 * Create withdrawal request
 */
export async function createWithdrawalRequest(
  userId: string,
  withdrawalType: 'roi' | 'principal' | 'commission' | 'bonus',
  requestedAmount: number,
  walletAddress?: string
): Promise<{ success: boolean; withdrawal_id?: string; message?: string }> {
  try {
    // Get user's wallet balance
    const userResult = await query(
      'SELECT wallet_balance, total_investment FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const user = userResult.rows[0];
    const walletBalance = parseFloat(user.wallet_balance);
    const totalInvestment = parseFloat(user.total_investment);

    // Check if user has sufficient balance
    if (walletBalance < requestedAmount) {
      return {
        success: false,
        message: `Insufficient balance. Available: $${walletBalance.toFixed(2)}`
      };
    }

    // Get withdrawal configuration
    const config = await getPrincipalWithdrawalConfig();
    if (!config) {
      return { success: false, message: 'Withdrawal configuration not found' };
    }

    // Check minimum withdrawal
    if (requestedAmount < config.minimum_withdrawal) {
      return {
        success: false,
        message: `Minimum withdrawal is $${config.minimum_withdrawal}`
      };
    }

    let deductionPercentage = 0;
    let deductionAmount = 0;
    let finalAmount = requestedAmount;
    let daysHeld = 0;
    let investmentDate: Date | null = null;

    // Calculate deduction for principal withdrawal
    if (withdrawalType === 'principal') {
      const deductionInfo = await calculatePrincipalDeduction(userId, requestedAmount);
      deductionPercentage = deductionInfo.deduction_percentage;
      deductionAmount = deductionInfo.deduction_amount;
      finalAmount = deductionInfo.final_amount;
      daysHeld = deductionInfo.days_held;
      investmentDate = deductionInfo.investment_date;
    }

    // Create withdrawal record
    const withdrawalId = crypto.randomUUID();
    await query(
      `INSERT INTO withdrawals (
        id, user_id, withdrawal_type, requested_amount,
        deduction_percentage, deduction_amount, final_amount,
        wallet_address, status, investment_date, withdrawal_date, days_held
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), ?)`,
      [
        withdrawalId,
        userId,
        withdrawalType,
        requestedAmount,
        deductionPercentage,
        deductionAmount,
        finalAmount,
        walletAddress,
        investmentDate,
        daysHeld
      ]
    );

    // Temporarily deduct from wallet (will be refunded if rejected)
    await query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
      [requestedAmount, userId]
    );

    console.log(`✅ Withdrawal request created: ${withdrawalId} for user ${userId}`);
    console.log(`   Type: ${withdrawalType}, Amount: $${requestedAmount}, Deduction: ${deductionPercentage}%, Final: $${finalAmount}`);

    return {
      success: true,
      withdrawal_id: withdrawalId,
      message: `Withdrawal request submitted. Final amount after ${deductionPercentage}% deduction: $${finalAmount.toFixed(2)}`
    };
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return {
      success: false,
      message: 'Failed to create withdrawal request'
    };
  }
}

/**
 * Approve withdrawal (Admin)
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get withdrawal details
    const withdrawalResult = await query(
      'SELECT * FROM withdrawals WHERE id = ? LIMIT 1',
      [withdrawalId]
    );

    if (withdrawalResult.rows.length === 0) {
      return { success: false, message: 'Withdrawal not found' };
    }

    const withdrawal = withdrawalResult.rows[0];

    if (withdrawal.status !== 'pending') {
      return { success: false, message: `Withdrawal is already ${withdrawal.status}` };
    }

    // Update withdrawal status
    await query(
      `UPDATE withdrawals
       SET status = 'approved',
           approved_by = ?,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [adminId, withdrawalId]
    );

    // Update user total_withdrawal
    await query(
      'UPDATE users SET total_withdrawal = total_withdrawal + ? WHERE id = ?',
      [withdrawal.final_amount, withdrawal.user_id]
    );

    // Create transaction record
    await query(
      `INSERT INTO mlm_transactions (
        user_id, transaction_type, amount, description, status
      ) VALUES (?, ?, ?, ?, 'completed')`,
      [
        withdrawal.user_id,
        withdrawal.withdrawal_type === 'principal' ? 'principal_withdrawal' : 'withdrawal',
        -withdrawal.final_amount,
        `${withdrawal.withdrawal_type} withdrawal approved (Deduction: ${withdrawal.deduction_percentage}%)`
      ]
    );

    console.log(`✅ Withdrawal ${withdrawalId} approved by admin ${adminId}`);

    return {
      success: true,
      message: 'Withdrawal approved successfully'
    };
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    return { success: false, message: 'Failed to approve withdrawal' };
  }
}

/**
 * Reject withdrawal (Admin)
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get withdrawal details
    const withdrawalResult = await query(
      'SELECT * FROM withdrawals WHERE id = ? LIMIT 1',
      [withdrawalId]
    );

    if (withdrawalResult.rows.length === 0) {
      return { success: false, message: 'Withdrawal not found' };
    }

    const withdrawal = withdrawalResult.rows[0];

    if (withdrawal.status !== 'pending') {
      return { success: false, message: `Withdrawal is already ${withdrawal.status}` };
    }

    // Update withdrawal status
    await query(
      `UPDATE withdrawals
       SET status = 'rejected',
           rejection_reason = ?,
           approved_by = ?,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [reason, adminId, withdrawalId]
    );

    // Refund to user wallet
    await query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [withdrawal.requested_amount, withdrawal.user_id]
    );

    console.log(`❌ Withdrawal ${withdrawalId} rejected by admin ${adminId}. Reason: ${reason}`);

    return {
      success: true,
      message: 'Withdrawal rejected and amount refunded to wallet'
    };
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return { success: false, message: 'Failed to reject withdrawal' };
  }
}

/**
 * Get pending withdrawals (Admin)
 */
export async function getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const result = await query(
      `SELECT w.*, u.email, u.full_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       WHERE w.status = 'pending'
       ORDER BY w.created_at ASC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      withdrawal_type: row.withdrawal_type,
      requested_amount: parseFloat(row.requested_amount),
      deduction_percentage: parseFloat(row.deduction_percentage),
      deduction_amount: parseFloat(row.deduction_amount),
      final_amount: parseFloat(row.final_amount),
      wallet_address: row.wallet_address,
      status: row.status,
      days_held: row.days_held
    }));
  } catch (error) {
    console.error('Error getting pending withdrawals:', error);
    return [];
  }
}

/**
 * Get user withdrawals
 */
export async function getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  try {
    const result = await query(
      `SELECT * FROM withdrawals
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      withdrawal_type: row.withdrawal_type,
      requested_amount: parseFloat(row.requested_amount),
      deduction_percentage: parseFloat(row.deduction_percentage),
      deduction_amount: parseFloat(row.deduction_amount),
      final_amount: parseFloat(row.final_amount),
      wallet_address: row.wallet_address,
      status: row.status,
      rejection_reason: row.rejection_reason,
      days_held: row.days_held,
      investment_date: row.investment_date ? new Date(row.investment_date) : undefined,
      withdrawal_date: row.withdrawal_date ? new Date(row.withdrawal_date) : undefined
    }));
  } catch (error) {
    console.error('Error getting user withdrawals:', error);
    return [];
  }
}
