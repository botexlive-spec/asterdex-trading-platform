/**
 * Admin Service - MySQL Backend API
 * Handles all admin operations via MySQL backend
 * NO SUPABASE - Pure MySQL API
 */

import { apiClient } from '../utils/api-client';

// Types
export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalInvestment: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  sponsor_id: string | null;
  referral_code: string;
  wallet_balance: number;
  total_investment: number;
  total_earnings: number;
  roi_earnings: number;
  commission_earnings: number;
  binary_earnings: number;
  current_rank: string;
  kyc_status: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  daily_roi_percentage: number;
  duration_days: number;
  min_investment: number;
  max_investment: number;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const response = await apiClient.get<AdminDashboardStats>('/admin/analytics/overview');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Get all users with pagination and filters
 */
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<{ users: User[]; pagination: any }> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);

    const url = `/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<{ users: User[]; pagination: any }>(url);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching users:', error);
    throw error;
  }
}

/**
 * Get single user by ID
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    const response = await apiClient.get<User>(`/admin/users/${userId}`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching user:', error);
    throw error;
  }
}

/**
 * Create new user
 */
export async function createUser(userData: {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  sponsor_id?: string;
}): Promise<User> {
  try {
    const response = await apiClient.post<User>('/admin/users', userData);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error creating user:', error);
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  try {
    const response = await apiClient.put<User>(`/admin/users/${userId}`, updates);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/admin/users/${userId}`);

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error: any) {
    console.error('❌ [Admin Service] Error deleting user:', error);
    throw error;
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  try {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`, {
      newPassword,
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error: any) {
    console.error('❌ [Admin Service] Error resetting password:', error);
    throw error;
  }
}

/**
 * Get all packages
 */
export async function getPackages(): Promise<Package[]> {
  try {
    const response = await apiClient.get<{ packages: Package[] }>('/admin/packages');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!.packages;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching packages:', error);
    throw error;
  }
}

/**
 * Create package
 */
export async function createPackage(packageData: Partial<Package>): Promise<Package> {
  try {
    const response = await apiClient.post<Package>('/admin/packages', packageData);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error creating package:', error);
    throw error;
  }
}

/**
 * Update package
 */
export async function updatePackage(
  packageId: string,
  updates: Partial<Package>
): Promise<Package> {
  try {
    const response = await apiClient.put<Package>(`/admin/packages/${packageId}`, updates);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error updating package:', error);
    throw error;
  }
}

/**
 * Delete package
 */
export async function deletePackage(packageId: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/admin/packages/${packageId}`);

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error: any) {
    console.error('❌ [Admin Service] Error deleting package:', error);
    throw error;
  }
}

/**
 * Get all transactions
 */
export async function getTransactions(params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}): Promise<{ transactions: Transaction[]; pagination: any }> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);

    const url = `/admin/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<{ transactions: Transaction[]; pagination: any }>(url);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Get all commissions
 */
export async function getCommissions(params?: {
  page?: number;
  limit?: number;
  type?: string;
}): Promise<{ commissions: any[]; pagination: any }> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const url = `/admin/commissions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<{ commissions: any[]; pagination: any }>(url);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching commissions:', error);
    throw error;
  }
}

/**
 * Trigger ROI distribution manually
 */
export async function distributeROI(): Promise<{ message: string; distributed: number }> {
  try {
    const response = await apiClient.post<{ message: string; distributed: number }>(
      '/admin/distribute-roi'
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error distributing ROI:', error);
    throw error;
  }
}

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `/admin/analytics/revenue${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  } catch (error: any) {
    console.error('❌ [Admin Service] Error fetching revenue analytics:', error);
    throw error;
  }
}

export default {
  getAdminDashboardStats,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getTransactions,
  getCommissions,
  distributeROI,
  getRevenueAnalytics,
};
