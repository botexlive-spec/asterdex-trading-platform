/**
 * Admin Financial Service
 * Handles deposits, withdrawals, and financial operations
 * Uses Express MySQL backend API
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  proof_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  bank_details?: Record<string, any>;
  wallet_address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  kyc_status?: string;
  available_balance?: number;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface FinancialStats {
  total_deposits: number;
  total_withdrawals: number;
  pending_deposits: number;
  pending_withdrawals: number;
  total_deposits_amount: number;
  total_withdrawals_amount: number;
  pending_deposits_amount: number;
  pending_withdrawals_amount: number;
}

/**
 * Get API base URL
 */
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

/**
 * Get authentication token from storage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

/**
 * Make authenticated API request
 */
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  const url = `${getApiUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Get all deposits with filters
 */
export const getAllDeposits = async (filters?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Deposit[]> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for deposits
    // For now, return empty array as deposits table doesn't exist
    console.warn('getAllDeposits not implemented - deposits table does not exist');
    return [];
  } catch (error: any) {
    console.error('Error getting deposits:', error);
    return [];
  }
};

/**
 * Get all withdrawals with filters
 */
export const getAllWithdrawals = async (filters?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Withdrawal[]> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for withdrawals
    // For now, return empty array as withdrawals table doesn't exist
    console.warn('getAllWithdrawals not implemented - withdrawals table does not exist');
    return [];
  } catch (error: any) {
    console.error('Error getting withdrawals:', error);
    return [];
  }
};

/**
 * Approve deposit
 */
export const approveDeposit = async (
  depositId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for deposit approval
    console.warn('approveDeposit not implemented yet');
    return { success: false, message: 'Deposits feature not implemented' };
  } catch (error: any) {
    console.error('Error approving deposit:', error);
    throw error;
  }
};

/**
 * Reject deposit
 */
export const rejectDeposit = async (
  depositId: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for deposit rejection
    console.warn('rejectDeposit not implemented yet');
    return { success: false, message: 'Deposits feature not implemented' };
  } catch (error: any) {
    console.error('Error rejecting deposit:', error);
    throw error;
  }
};

/**
 * Approve withdrawal
 */
export const approveWithdrawal = async (
  withdrawalId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for withdrawal approval
    console.warn('approveWithdrawal not implemented yet');
    return { success: false, message: 'Withdrawals feature not implemented' };
  } catch (error: any) {
    console.error('Error approving withdrawal:', error);
    throw error;
  }
};

/**
 * Reject withdrawal
 */
export const rejectWithdrawal = async (
  withdrawalId: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for withdrawal rejection
    console.warn('rejectWithdrawal not implemented yet');
    return { success: false, message: 'Withdrawals feature not implemented' };
  } catch (error: any) {
    console.error('Error rejecting withdrawal:', error);
    throw error;
  }
};

/**
 * Get financial statistics
 */
export const getFinancialStats = async (): Promise<FinancialStats> => {
  try {
    await requireAdmin();

    const data = await apiRequest<any>('/api/admin/analytics/overview');

    return {
      total_deposits: 0, // TODO: Calculate from deposits table when it exists
      total_withdrawals: 0,
      pending_deposits: 0,
      pending_withdrawals: data.pending_withdrawals || 0,
      total_deposits_amount: 0,
      total_withdrawals_amount: data.total_withdrawals || 0,
      pending_deposits_amount: 0,
      pending_withdrawals_amount: data.pending_withdrawals_amount || 0,
    };
  } catch (error: any) {
    console.error('Error getting financial stats:', error);
    return {
      total_deposits: 0,
      total_withdrawals: 0,
      pending_deposits: 0,
      pending_withdrawals: 0,
      total_deposits_amount: 0,
      total_withdrawals_amount: 0,
      pending_deposits_amount: 0,
      pending_withdrawals_amount: 0,
    };
  }
};
