/**
 * MLM API Client - MySQL Backend
 * Uses httpClient for automatic token refresh on 401 responses
 */

import { get, post } from '../utils/httpClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Re-export types from wallet.service for compatibility
export type { WalletBalance, Transaction, DepositAddress } from './wallet.service';

/**
 * Get user dashboard data
 */
export async function getUserDashboard() {
  try {
    const data = await get('/api/dashboard');

    // Ensure all expected fields have fallback values
    return {
      user: data.user || {},
      statistics: {
        today_earnings: data.statistics?.today_earnings || 0,
        week_earnings: data.statistics?.week_earnings || 0,
        month_earnings: data.statistics?.month_earnings || 0,
        roi_earned: data.statistics?.roi_earned || 0,
        direct_referrals: data.statistics?.direct_referrals || 0,
        total_team: data.statistics?.total_team || 0,
        left_binary_volume: data.statistics?.left_binary_volume || 0,
        right_binary_volume: data.statistics?.right_binary_volume || 0,
      },
      packages: {
        active_count: data.packages?.active_count || 0,
        expiring_soon: data.packages?.expiring_soon || 0,
      },
      active_packages: data.active_packages || [],
      recent_transactions: data.recent_transactions || [],
      direct_referrals: data.direct_referrals || [],
      next_rank: {
        current: data.next_rank?.current || 'starter',
        next: data.next_rank?.next || 'bronze',
        progress: data.next_rank?.progress || 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    // Return minimal safe structure
    return {
      user: {},
      statistics: {
        today_earnings: 0,
        week_earnings: 0,
        month_earnings: 0,
        roi_earned: 0,
        direct_referrals: 0,
        total_team: 0,
        left_binary_volume: 0,
        right_binary_volume: 0,
      },
      packages: { active_count: 0, expiring_soon: 0 },
      active_packages: [],
      recent_transactions: [],
      direct_referrals: [],
      next_rank: { current: 'starter', next: 'bronze', progress: 0 },
    };
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(limit: number = 50, offset: number = 0, type?: string) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (type) {
    params.append('type', type);
  }

  return get(`/api/transactions?${params.toString()}`);
}

/**
 * Get packages (stub - implement when needed)
 */
export async function getPackages() {
  return get('/api/packages');
}

/**
 * Get user packages (stub - implement when needed)
 */
export async function getUserPackages() {
  return get('/api/packages/user');
}

// ============================================
// WALLET OPERATIONS
// ============================================

/**
 * Get wallet balance
 */
export async function getWalletBalance() {
  return get('/api/wallet/balance');
}

/**
 * Generate deposit address
 */
export async function generateDepositAddress(crypto: string, network: string) {
  return post('/api/wallet/deposit/address', { crypto, network });
}

/**
 * Submit deposit request
 */
export async function submitDeposit(request: {
  method: string;
  amount: number;
  crypto?: string;
  network?: string;
  transactionId?: string;
  referenceNumber?: string;
  utrNumber?: string;
}) {
  return post('/api/wallet/deposit', request);
}

/**
 * Get withdrawal limits
 */
export async function getWithdrawalLimits() {
  return get('/api/wallet/withdrawal/limits');
}

/**
 * Submit withdrawal request
 */
export async function submitWithdrawal(request: {
  amount: number;
  method: string;
  accountId: string;
  password: string;
  verificationCode?: string;
}) {
  return post('/api/wallet/withdrawal', request);
}

/**
 * Transfer funds to another user
 */
export async function transferFunds(request: {
  recipientId: string;
  amount: number;
  note?: string;
  password: string;
}) {
  return post('/api/wallet/transfer', request);
}

/**
 * Get pending transactions (deposits/withdrawals)
 */
export async function getPendingTransactions() {
  return get('/api/wallet/transactions/pending');
}

// ============================================
// ROBOT SUBSCRIPTION MANAGEMENT
// ============================================

export interface RobotSubscription {
  id: string;
  user_id: string;
  subscription_type: string;
  amount: number;
  is_active: boolean;
  started_at: string;
  expires_at: string;
  created_at: string;
}

/**
 * Get user's robot subscription
 * TODO: Implement backend API endpoint
 */
export async function getUserRobotSubscription(userId?: string): Promise<RobotSubscription | null> {
  try {
    // Stub implementation - returns null until backend endpoint is created
    console.warn('getUserRobotSubscription: Backend endpoint not implemented yet');
    return null;
  } catch (error) {
    console.error('Error fetching robot subscription:', error);
    return null;
  }
}

/**
 * Check if user has active robot subscription
 * TODO: Implement backend API endpoint
 */
export async function hasActiveRobotSubscription(userId?: string): Promise<boolean> {
  try {
    const subscription = await getUserRobotSubscription(userId);
    return !!subscription;
  } catch (error) {
    console.error('Error checking robot subscription:', error);
    return false;
  }
}

/**
 * Purchase robot subscription
 * TODO: Implement backend API endpoint
 */
export async function purchaseRobotSubscription(): Promise<RobotSubscription> {
  try {
    // Stub implementation - throw error until backend endpoint is created
    throw new Error('Robot subscription purchase not implemented yet. Please contact support.');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to purchase robot subscription');
  }
}

// ============================================
// CONFIG CACHE MANAGEMENT
// ============================================

/**
 * Clear configuration cache
 * This is a no-op in the MySQL implementation since caching is handled server-side
 */
export function clearConfigCache(): void {
  console.log('clearConfigCache: No-op in MySQL implementation (server-side caching)');
}
