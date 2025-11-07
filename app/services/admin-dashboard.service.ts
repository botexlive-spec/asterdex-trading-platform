/**
 * Admin Dashboard Service
 * Provides comprehensive dashboard statistics and metrics
 * Uses Express MySQL backend API
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface DashboardStats {
  // User metrics
  total_users: number;
  active_users: number;
  today_registrations: number;
  week_registrations: number;
  month_registrations: number;

  // Financial metrics
  total_revenue: number;
  total_investments: number;
  total_withdrawals: number;
  pending_withdrawals: number;
  pending_withdrawals_amount: number;

  // Package metrics
  active_packages: number;
  total_packages_sold: number;

  // KYC metrics
  pending_kyc: number;
  approved_kyc: number;

  // Commission metrics
  total_commissions_paid: number;
  pending_commissions: number;

  // ROI metrics
  total_roi_distributed: number;

  // Binary metrics
  total_binary_earnings: number;

  // Robot subscriptions
  active_robot_subscriptions: number;
}

export interface RecentActivity {
  id: string;
  type: 'registration' | 'package' | 'withdrawal' | 'kyc' | 'robot';
  user_id: string;
  user_name: string;
  description: string;
  amount?: number;
  timestamp: string;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  total_investment: number;
  total_earnings: number;
  rank: string;
  team_size: number;
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
 * Helper function to safely execute API calls
 */
const safeQuery = async <T>(queryFn: () => Promise<T>, defaultValue: T): Promise<T> => {
  try {
    return await queryFn();
  } catch (error) {
    console.warn('Query failed, using default:', error);
    return defaultValue;
  }
};

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Verify admin access
    await requireAdmin();

    console.log('🚀 Loading dashboard stats from MySQL API...');
    const startTime = Date.now();

    // Call the analytics overview endpoint
    const data = await apiRequest<any>('/api/admin/analytics/overview');

    const loadTime = Date.now() - startTime;
    console.log(`✅ Dashboard stats loaded in ${loadTime}ms`);

    // Map the backend response to our DashboardStats interface
    return {
      total_users: data.total_users || 0,
      active_users: data.active_users || 0,
      today_registrations: data.today_registrations || 0,
      week_registrations: data.week_registrations || 0,
      month_registrations: data.month_registrations || 0,
      total_revenue: data.total_revenue || 0,
      total_investments: data.total_investments || 0,
      total_withdrawals: data.total_withdrawals || 0,
      pending_withdrawals: data.pending_withdrawals || 0,
      pending_withdrawals_amount: data.pending_withdrawals_amount || 0,
      active_packages: data.active_packages || 0,
      total_packages_sold: data.total_packages_sold || 0,
      pending_kyc: data.pending_kyc || 0,
      approved_kyc: data.approved_kyc || 0,
      total_commissions_paid: data.total_commissions_paid || 0,
      pending_commissions: data.pending_commissions || 0,
      total_roi_distributed: data.total_roi_distributed || 0,
      total_binary_earnings: data.total_binary_earnings || 0,
      active_robot_subscriptions: data.active_robot_subscriptions || 0,
    };
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    throw new Error(error.message || 'Failed to get dashboard statistics');
  }
};

/**
 * Get recent platform activities
 */
export const getRecentActivities = async (limit: number = 20): Promise<RecentActivity[]> => {
  try {
    // Verify admin access
    await requireAdmin();

    const activities: RecentActivity[] = [];

    // Get recent transactions (includes package purchases, withdrawals, etc.)
    const transactions = await safeQuery(async () => {
      const data = await apiRequest<any>(`/api/admin/transactions?limit=${limit}&sort=created_at&order=desc`);
      return data.transactions || [];
    }, []);

    // Get recent users for registration activities
    const recentUsers = await safeQuery(async () => {
      const data = await apiRequest<any>(`/api/admin/users?limit=10&sort=created_at&order=desc`);
      return data.users || [];
    }, []);

    // Add registration activities
    recentUsers.slice(0, 5).forEach((user: any) => {
      activities.push({
        id: `reg-${user.id}`,
        type: 'registration',
        user_id: user.id,
        user_name: user.full_name || user.email,
        description: 'New user registered',
        timestamp: user.created_at,
      });
    });

    // Add transaction activities
    transactions.forEach((txn: any) => {
      let type: RecentActivity['type'] = 'package';
      let description = '';

      switch (txn.transaction_type) {
        case 'package_purchase':
          type = 'package';
          description = 'Package purchased';
          break;
        case 'withdrawal':
          type = 'withdrawal';
          description = 'Withdrawal requested';
          break;
        case 'level_income':
        case 'matching_bonus':
        case 'roi_distribution':
          description = txn.description || txn.transaction_type;
          break;
        default:
          description = txn.description || 'Transaction';
      }

      activities.push({
        id: `txn-${txn.id}`,
        type,
        user_id: txn.user_id,
        user_name: txn.full_name || txn.email || 'Unknown User',
        description,
        amount: Math.abs(parseFloat(txn.amount)),
        timestamp: txn.created_at,
      });
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, limit);
  } catch (error: any) {
    console.error('Error getting recent activities:', error);
    return [];
  }
};

/**
 * Get top users by investment
 */
export const getTopUsers = async (limit: number = 10): Promise<TopUser[]> => {
  try {
    // Verify admin access
    await requireAdmin();

    const data = await apiRequest<any>(`/api/admin/users?limit=${limit}&sort=total_investment&order=desc`);
    const users = data.users || [];

    const topUsers: TopUser[] = users.map((user: any) => ({
      id: user.id,
      name: user.full_name || user.email,
      email: user.email,
      total_investment: parseFloat(user.total_investment) || 0,
      total_earnings: parseFloat(user.total_earnings) || 0,
      rank: user.current_rank || 'Starter',
      team_size: parseInt(user.direct_team || user.team_size) || 0,
    }));

    return topUsers;
  } catch (error: any) {
    console.error('Error getting top users:', error);
    return [];
  }
};

/**
 * Get growth chart data (registrations over time)
 */
export const getGrowthChartData = async (days: number = 30) => {
  try {
    // Verify admin access
    await requireAdmin();

    // Get all users and group by date
    const data = await apiRequest<any>('/api/admin/users?limit=10000');
    const users = data.users || [];

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Group by date
    const dateMap = new Map();
    users.forEach((user: any) => {
      const createdAt = new Date(user.created_at);
      if (createdAt >= startDate) {
        const date = createdAt.toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date,
        registrations: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Error getting growth chart data:', error);
    return [];
  }
};

/**
 * Get revenue chart data
 */
export const getRevenueChartData = async (days: number = 30) => {
  try {
    // Verify admin access
    await requireAdmin();

    const data = await apiRequest<any>(`/api/admin/analytics/revenue?days=${days}`);

    if (data.revenue_by_day) {
      return data.revenue_by_day.map((item: any) => ({
        date: item.date,
        revenue: parseFloat(item.revenue) || 0,
      }));
    }

    // Fallback: calculate from transactions
    const transactions = await safeQuery(async () => {
      const txnData = await apiRequest<any>('/api/admin/transactions?limit=10000');
      return txnData.transactions || [];
    }, []);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dateMap = new Map();

    transactions.forEach((txn: any) => {
      const createdAt = new Date(txn.created_at);
      if (createdAt >= startDate && txn.transaction_type === 'package_purchase') {
        const date = createdAt.toISOString().split('T')[0];
        const current = dateMap.get(date) || { date, revenue: 0 };
        current.revenue += Math.abs(parseFloat(txn.amount));
        dateMap.set(date, current);
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Error getting revenue chart data:', error);
    return [];
  }
};
