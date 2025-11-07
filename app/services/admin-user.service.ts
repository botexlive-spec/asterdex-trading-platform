/**
 * Admin User Service
 * Handles admin-specific user management operations
 * Uses Express MySQL backend API
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface UserDetailedInfo {
  id: string;
  email: string;
  full_name: string;
  wallet_balance: number;
  total_investment: number;
  total_earnings: number;
  referral_code: string;
  referred_by?: string;
  rank: string;
  kyc_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_referrals?: number;
  active_packages?: number;
  pending_withdrawals?: number;
}

export interface UserPackageInfo {
  id: string;
  package_id: string;
  package_name: string;
  amount_invested: number;
  start_date: string;
  end_date: string;
  daily_return: number;
  total_return: number;
  claimed_return: number;
  status: string;
  created_at: string;
}

export interface UserTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  status: string;
  metadata: any;
  created_at: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  rank: string;
  total_investment: number;
  wallet_balance: number;
  created_at: string;
  is_active: boolean;
}

export interface UserEarnings {
  roi_earnings: number;
  referral_earnings: number;
  binary_earnings: number;
  rank_bonus: number;
  total_earnings: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  metadata: any;
  created_at: string;
}

export interface AdminActionRequest {
  user_id: string;
  action_type: 'wallet_adjustment' | 'rank_change' | 'suspend' | 'activate' | 'reset_password';
  amount?: number;
  new_rank?: string;
  reason: string;
  admin_notes?: string;
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
 * Get all users with optional filtering and pagination
 */
export const getAllUsers = async (
  filters: any = {},
  page: number = 1,
  limit: number = 50
): Promise<{ users: UserDetailedInfo[]; total: number; page: number; totalPages: number }> => {
  try {
    await requireAdmin();

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const data = await apiRequest<any>(`/api/admin/users?${params}`);

    return {
      users: (data.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.email,
        wallet_balance: parseFloat(user.wallet_balance) || 0,
        total_investment: parseFloat(user.total_investment) || 0,
        total_earnings: parseFloat(user.total_earnings) || 0,
        referral_code: user.referral_code || '',
        referred_by: user.sponsor_id,
        rank: user.current_rank || 'starter',
        kyc_status: user.kyc_status || 'not_submitted',
        is_active: Boolean(user.is_active),
        created_at: user.created_at,
        updated_at: user.updated_at,
        total_referrals: 0, // TODO: Calculate from team
        active_packages: 0, // TODO: Calculate from packages
        pending_withdrawals: 0, // TODO: Calculate from withdrawals
      })),
      total: data.pagination?.total || 0,
      page: data.pagination?.page || page,
      totalPages: data.pagination?.totalPages || 1,
    };
  } catch (error: any) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Get detailed user information
 */
export const getUserDetailedInfo = async (userId: string): Promise<UserDetailedInfo | null> => {
  try {
    await requireAdmin();

    const data = await apiRequest<any>(`/api/admin/users/${userId}`);

    if (!data || !data.user) {
      return null;
    }

    const user = data.user;
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || user.email,
      wallet_balance: parseFloat(user.wallet_balance) || 0,
      total_investment: parseFloat(user.total_investment) || 0,
      total_earnings: parseFloat(user.total_earnings) || 0,
      referral_code: user.referral_code || '',
      referred_by: user.sponsor_id,
      rank: user.current_rank || 'starter',
      kyc_status: user.kyc_status || 'not_submitted',
      is_active: Boolean(user.is_active),
      created_at: user.created_at,
      updated_at: user.updated_at,
      total_referrals: 0,
      active_packages: 0,
      pending_withdrawals: 0,
    };
  } catch (error: any) {
    console.error('Error getting user detailed info:', error);
    return null;
  }
};

/**
 * Get user's packages
 */
export const getUserPackages = async (userId: string): Promise<UserPackageInfo[]> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for user packages
    // For now, return empty array
    return [];
  } catch (error: any) {
    console.error('Error getting user packages:', error);
    return [];
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (userId: string, limit: number = 50): Promise<UserTransaction[]> => {
  try {
    await requireAdmin();

    const data = await apiRequest<any>(`/api/admin/transactions?user_id=${userId}&limit=${limit}`);

    return (data.transactions || []).map((txn: any) => ({
      id: txn.id,
      transaction_type: txn.transaction_type,
      amount: parseFloat(txn.amount),
      status: txn.status,
      metadata: {
        description: txn.description,
      },
      created_at: txn.created_at,
    }));
  } catch (error: any) {
    console.error('Error getting user transactions:', error);
    return [];
  }
};

/**
 * Get user's team members
 */
export const getUserTeam = async (userId: string): Promise<TeamMember[]> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for user team
    // For now, return empty array
    return [];
  } catch (error: any) {
    console.error('Error getting user team:', error);
    return [];
  }
};

/**
 * Get user's earnings breakdown
 */
export const getUserEarnings = async (userId: string): Promise<UserEarnings | null> => {
  try {
    await requireAdmin();

    const userInfo = await getUserDetailedInfo(userId);

    if (!userInfo) {
      return null;
    }

    // TODO: Get actual breakdown from backend
    return {
      roi_earnings: 0,
      referral_earnings: 0,
      binary_earnings: 0,
      rank_bonus: 0,
      total_earnings: userInfo.total_earnings,
    };
  } catch (error: any) {
    console.error('Error getting user earnings:', error);
    return null;
  }
};

/**
 * Get user's activity log
 */
export const getUserActivityLog = async (userId: string, limit: number = 50): Promise<ActivityLog[]> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for activity log
    // For now, return empty array
    return [];
  } catch (error: any) {
    console.error('Error getting user activity log:', error);
    return [];
  }
};

/**
 * Assign package to user
 */
export const assignPackageToUser = async (
  userId: string,
  packageId: string,
  amount: number
): Promise<boolean> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for package assignment
    // For now, return false
    console.warn('assignPackageToUser not implemented yet');
    return false;
  } catch (error: any) {
    console.error('Error assigning package to user:', error);
    throw error;
  }
};

/**
 * Cancel user package
 */
export const cancelUserPackage = async (packageId: string, reason: string): Promise<boolean> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for package cancellation
    // For now, return false
    console.warn('cancelUserPackage not implemented yet');
    return false;
  } catch (error: any) {
    console.error('Error cancelling user package:', error);
    throw error;
  }
};

/**
 * Create manual transaction
 */
export const createManualTransaction = async (
  userId: string,
  type: string,
  amount: number,
  description: string
): Promise<boolean> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for manual transactions
    // For now, return false
    console.warn('createManualTransaction not implemented yet');
    return false;
  } catch (error: any) {
    console.error('Error creating manual transaction:', error);
    throw error;
  }
};

/**
 * Adjust wallet balance
 */
export const adjustWalletBalance = async (
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for wallet adjustment
    // For now, return false
    console.warn('adjustWalletBalance not implemented yet');
    return false;
  } catch (error: any) {
    console.error('Error adjusting wallet balance:', error);
    throw error;
  }
};

/**
 * Change user rank
 */
export const changeUserRank = async (
  userId: string,
  newRank: string,
  reason: string
): Promise<boolean> => {
  try {
    await requireAdmin();

    // TODO: Create backend endpoint for rank change
    // For now, return false
    console.warn('changeUserRank not implemented yet');
    return false;
  } catch (error: any) {
    console.error('Error changing user rank:', error);
    throw error;
  }
};

/**
 * Suspend user
 */
export const suspendUser = async (userId: string, reason: string): Promise<boolean> => {
  try {
    await requireAdmin();

    await apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        is_active: false,
        reason,
      }),
    });

    return true;
  } catch (error: any) {
    console.error('Error suspending user:', error);
    throw error;
  }
};

/**
 * Activate user
 */
export const activateUser = async (userId: string): Promise<boolean> => {
  try {
    await requireAdmin();

    await apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        is_active: true,
      }),
    });

    return true;
  } catch (error: any) {
    console.error('Error activating user:', error);
    throw error;
  }
};
