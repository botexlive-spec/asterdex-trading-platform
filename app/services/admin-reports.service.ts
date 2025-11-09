/**
 * Admin Reports Service
 * Generate comprehensive reports from database
 */

import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: Admin reports generation
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-reports.ts
 * 2. Replace TODO comments with actual API calls using apiRequest()
 * 3. Follow pattern from admin-rank.service.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage or sessionStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}


// ============================================
// SERVICE FUNCTIONS (Need MySQL Backend APIs)
// ============================================


export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

// ============================================
// USER GROWTH REPORT
// ============================================

export const getUserGrowthReport = async (dateRange: ReportDateRange) => {
  try {
    const params = new URLSearchParams({
      startDate: dateRange.dateFrom,
      endDate: dateRange.dateTo,
      period: 'day',
    });

    const result = await apiRequest(`/api/reports/users?${params.toString()}`);

    // Transform to expected format
    return (result.registrationsByPeriod || []).map((item: any) => ({
      Date: item.period,
      NewUsers: item.count,
      ActiveUsers: 0,
      TotalUsers: item.count,
    }));
  } catch (error: any) {
    console.error('User growth report error:', error);
    return [];
  }
};

// ============================================
// REVENUE REPORT
// ============================================

export const getRevenueReport = async (dateRange: ReportDateRange) => {
  try {
    const params = new URLSearchParams({
      startDate: dateRange.dateFrom,
      endDate: dateRange.dateTo,
      period: 'month',
    });

    const result = await apiRequest(`/api/reports/revenue?${params.toString()}`);

    // Transform to expected format
    return (result.revenueByPeriod || []).map((item: any) => ({
      Month: item.period,
      PackageSales: item.revenue || 0,
      Commissions: 0, // Would need separate calculation
      NetRevenue: item.revenue || 0,
    }));
  } catch (error: any) {
    console.error('Revenue report error:', error);
    return [];
  }
};

// ============================================
// INVESTMENT REPORT
// ============================================

export const getInvestmentReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by package
    const grouped = userPackages?.reduce((acc: any, pkg: any) => {
      const packageName = pkg.packages?.name || 'Unknown';
      if (!acc[packageName]) {
        acc[packageName] = { Package: packageName, Count: 0, Amount: 0 };
      }
      acc[packageName].Count++;
      acc[packageName].Amount += pkg.amount;
      return acc;
    }, {});

    return Object.values(grouped || {});
  } catch (error: any) {
    console.error('Investment report error:', error);
    return [];
  }
};

// ============================================
// EARNINGS REPORT
// ============================================

export const getEarningsReport = async (dateRange: ReportDateRange) => {
  try {
    const params = new URLSearchParams({
      startDate: dateRange.dateFrom,
      endDate: dateRange.dateTo,
    });

    const result = await apiRequest(`/api/reports/transactions?${params.toString()}`);

    // Transform to expected format
    const typeData = result.transactionsByType || {};
    return Object.keys(typeData).map((type) => ({
      Type: type,
      Count: typeData[type].count || 0,
      TotalAmount: typeData[type].amount || 0,
      UniqueUsers: typeData[type].count || 0, // Approximate
    }));
  } catch (error: any) {
    console.error('Earnings report error:', error);
    return [];
  }
};

// ============================================
// WITHDRAWAL REPORT
// ============================================

export const getWithdrawalReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by status
    const grouped = withdrawals?.reduce((acc: any, withdrawal) => {
      const status = withdrawal.status;
      if (!acc[status]) {
        acc[status] = { Status: status, Count: 0, TotalAmount: 0 };
      }
      acc[status].Count++;
      acc[status].TotalAmount += withdrawal.amount;
      return acc;
    }, {});

    return Object.values(grouped || {});
  } catch (error: any) {
    console.error('Withdrawal report error:', error);
    return [];
  }
};

// ============================================
// PACKAGE PERFORMANCE REPORT
// ============================================

export const getPackagePerformanceReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by package
    const grouped = userPackages?.reduce((acc: any, pkg: any) => {
      const packageName = pkg.packages?.name || 'Unknown';
      if (!acc[packageName]) {
        acc[packageName] = {
          Package: packageName,
          Sales: 0,
          TotalInvestment: 0,
          TotalROI: 0,
          ActiveCount: 0,
        };
      }
      acc[packageName].Sales++;
      acc[packageName].TotalInvestment += pkg.amount;
      acc[packageName].TotalROI += pkg.roi_earned || 0;
      if (pkg.is_active) acc[packageName].ActiveCount++;
      return acc;
    }, {});

    // Calculate ROI percentage
    Object.values(grouped || {}).forEach((row: any) => {
      row.ROIPercentage = row.TotalInvestment > 0
        ? ((row.TotalROI / row.TotalInvestment) * 100).toFixed(2)
        : 0;
    });

    return Object.values(grouped || {});
  } catch (error: any) {
    console.error('Package performance report error:', error);
    return [];
  }
};

// ============================================
// RANK ACHIEVEMENT REPORT
// ============================================

export const getRankAchievementReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by rank
    const grouped = achievements?.reduce((acc: any, achievement) => {
      const rank = achievement.rank;
      if (!acc[rank]) {
        acc[rank] = {
          Rank: rank,
          Achievements: 0,
          TotalRewards: 0,
          UniqueUsers: new Set(),
        };
      }
      acc[rank].Achievements++;
      acc[rank].TotalRewards += achievement.reward_amount || 0;
      acc[rank].UniqueUsers.add(achievement.user_id);
      return acc;
    }, {});

    return Object.values(grouped || {}).map((row: any) => ({
      Rank: row.Rank,
      Achievements: row.Achievements,
      TotalRewards: row.TotalRewards,
      UniqueUsers: row.UniqueUsers.size,
    }));
  } catch (error: any) {
    console.error('Rank achievement report error:', error);
    return [];
  }
};

// ============================================
// TEAM PERFORMANCE REPORT
// ============================================

export const getTeamPerformanceReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// Get all users who registered in date range
    // TODO: Implement MySQL backend API endpoint // Top 50 performers

    if (error) throw error;

    return users?.map((user) => ({
      User: user.full_name || user.email,
      DirectReferrals: user.direct_count || 0,
      TeamSize: user.team_count || 0,
      TotalInvestment: user.total_investment || 0,
      TotalEarnings: user.total_earnings || 0,
      JoinedDate: format(new Date(user.created_at), 'MMM dd, yyyy'),
    })) || [];
  } catch (error: any) {
    console.error('Team performance report error:', error);
    return [];
  }
};

// ============================================
// KYC STATUS REPORT
// ============================================

export const getKYCStatusReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by status
    const grouped = kycSubmissions?.reduce((acc: any, submission) => {
      const status = submission.status;
      if (!acc[status]) {
        acc[status] = {
          Status: status,
          Count: 0,
          AvgReviewTimeHours: [],
        };
      }
      acc[status].Count++;

      // Calculate review time for approved/rejected
      if (submission.reviewed_at) {
        const reviewTime = (new Date(submission.reviewed_at).getTime() - new Date(submission.submitted_at).getTime()) / (1000 * 60 * 60);
        acc[status].AvgReviewTimeHours.push(reviewTime);
      }
      return acc;
    }, {});

    // Calculate average review time
    return Object.values(grouped || {}).map((row: any) => ({
      Status: row.Status,
      Count: row.Count,
      AvgReviewTime: row.AvgReviewTimeHours.length > 0
        ? `${(row.AvgReviewTimeHours.reduce((a: number, b: number) => a + b, 0) / row.AvgReviewTimeHours.length).toFixed(1)} hours`
        : 'N/A',
    }));
  } catch (error: any) {
    console.error('KYC status report error:', error);
    return [];
  }
};

// ============================================
// ACTIVE USERS REPORT
// ============================================

export const getActiveUsersReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    // Admin auth handled by backend// Get user activity from transactions
    // TODO: Implement MySQL backend API endpoint

    if (error) throw error;

    // Group by date
    const dailyActive: any = {};
    transactions?.forEach((txn) => {
      const date = format(new Date(txn.created_at), 'yyyy-MM-dd');
      if (!dailyActive[date]) {
        dailyActive[date] = new Set();
      }
      dailyActive[date].add(txn.user_id);
    });

    // Convert to array
    return Object.entries(dailyActive).map(([date, userSet]: [string, any]) => ({
      Date: date,
      ActiveUsers: userSet.size,
    }));
  } catch (error: any) {
    console.error('Active users report error:', error);
    return [];
  }
};

// ============================================
// ANALYTICS DASHBOARD DATA
// ============================================

export const getAnalyticsDashboardData = async () => {
  try {
        // Verify admin access
    // Admin auth handled by backend// Get last 7 months of data
    const last7Months = [];
    for (let i = 6; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      // Count users created in this month
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Get revenue for this month
      // TODO: Implement MySQL backend API endpoint

      const revenue = packages?.reduce((sum, pkg) => sum + pkg.amount, 0) || 0;

      last7Months.push({
        month: format(date, 'MMM'),
        users: userCount || 0,
        revenue: revenue,
      });
    }

    return last7Months;
  } catch (error: any) {
    console.error('Analytics dashboard data error:', error);
    return [];
  }
};

// ============================================
// REVENUE BREAKDOWN
// ============================================

export const getRevenueBreakdown = async () => {
  try {
        // Verify admin access
    // Admin auth handled by backend// Get package sales (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);

    // TODO: Implement MySQL backend API endpoint

    const packageSales = packages?.reduce((sum, pkg) => sum + pkg.amount, 0) || 0;

    // Get commission payouts
    // TODO: Implement MySQL backend API endpoint

    const commissionPayouts = commissions?.reduce((sum, txn) => sum + txn.amount, 0) || 0;

    // Get withdrawals
    // TODO: Implement MySQL backend API endpoint

    const withdrawalAmount = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

    const netRevenue = packageSales - commissionPayouts - withdrawalAmount;

    return [
      { name: 'Package Sales', value: packageSales, color: '#00C7D1' },
      { name: 'Commission Payouts', value: commissionPayouts, color: '#ef4444' },
      { name: 'Withdrawals', value: withdrawalAmount, color: '#f59e0b' },
      { name: 'Net Revenue', value: netRevenue, color: '#10b981' },
    ];
  } catch (error: any) {
    console.error('Revenue breakdown error:', error);
    return [];
  }
};

// ============================================
// PACKAGE PERFORMANCE DATA
// ============================================

export const getPackagePerformanceData = async () => {
  try {
        // Verify admin access
    // Admin auth handled by backend// TODO: Implement MySQL backend API endpoint

    // Group by package
    const grouped = userPackages?.reduce((acc: any, pkg: any) => {
      const packageName = pkg.packages?.name || 'Unknown';
      if (!acc[packageName]) {
        acc[packageName] = { package: packageName, sales: 0, revenue: 0 };
      }
      acc[packageName].sales++;
      acc[packageName].revenue += pkg.amount;
      return acc;
    }, {});

    return Object.values(grouped || {});
  } catch (error: any) {
    console.error('Package performance data error:', error);
    return [];
  }
};

// ============================================
// MASTER REPORT GENERATOR
// ============================================

export const generateReport = async (reportId: string, dateRange: ReportDateRange) => {
  const reportMap: Record<string, () => Promise<any[]>> = {
    'user-growth': () => getUserGrowthReport(dateRange),
    'revenue': () => getRevenueReport(dateRange),
    'investment': () => getInvestmentReport(dateRange),
    'earnings': () => getEarningsReport(dateRange),
    'withdrawal': () => getWithdrawalReport(dateRange),
    'package-performance': () => getPackagePerformanceReport(dateRange),
    'rank-achievement': () => getRankAchievementReport(dateRange),
    'team-performance': () => getTeamPerformanceReport(dateRange),
    'kyc-status': () => getKYCStatusReport(dateRange),
    'active-users': () => getActiveUsersReport(dateRange),
  };

  const generator = reportMap[reportId];
  if (!generator) {
    throw new Error(`Unknown report ID: ${reportId}`);
  }

  return await generator();
};
