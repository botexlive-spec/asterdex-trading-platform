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
  return get('/api/dashboard');
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
