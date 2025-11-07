/**
 * Admin Reports Service
 * Generate comprehensive reports from database
 */

import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { requireAdmin } from '../middleware/admin.middleware';

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

// ============================================
// USER GROWTH REPORT
// ============================================

export const getUserGrowthReport = async (dateRange: ReportDateRange) => {
  try {
        // Verify admin access
    await requireAdmin();

const { data: users, error } = await supabase
      .from('users')
      .select('created_at, is_active')
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo)
      .order('created_at');

    if (error) throw error;

    // Group by date
    const grouped = users?.reduce((acc: any, user) => {
      const date = format(new Date(user.created_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { Date: date, NewUsers: 0, ActiveUsers: 0, TotalUsers: 0 };
      }
      acc[date].NewUsers++;
      if (user.is_active) acc[date].ActiveUsers++;
      return acc;
    }, {});

    // Calculate cumulative totals
    const reportData = Object.values(grouped || {});
    let cumulative = 0;
    reportData.forEach((row: any) => {
      cumulative += row.NewUsers;
      row.TotalUsers = cumulative;
    });

    return reportData;
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
        // Verify admin access
    await requireAdmin();

// Get package sales
    const { data: packageSales, error: packagesError } = await supabase
      .from('user_packages')
      .select('amount, purchased_at')
      .gte('purchased_at', dateRange.dateFrom)
      .lte('purchased_at', dateRange.dateTo);

    if (packagesError) throw packagesError;

    // Get commission payouts
    const { data: commissions, error: commissionsError } = await supabase
      .from('mlm_transactions')
      .select('amount, created_at')
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income', 'rank_bonus'])
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo);

    if (commissionsError) throw commissionsError;

    // Group by month
    const monthlyData: any = {};

    packageSales?.forEach((sale) => {
      const month = format(new Date(sale.purchased_at), 'MMMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { Month: month, PackageSales: 0, Commissions: 0, NetRevenue: 0 };
      }
      monthlyData[month].PackageSales += sale.amount;
    });

    commissions?.forEach((commission) => {
      const month = format(new Date(commission.created_at), 'MMMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { Month: month, PackageSales: 0, Commissions: 0, NetRevenue: 0 };
      }
      monthlyData[month].Commissions += commission.amount;
    });

    // Calculate net revenue
    Object.values(monthlyData).forEach((row: any) => {
      row.NetRevenue = row.PackageSales - row.Commissions;
    });

    return Object.values(monthlyData);
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
    await requireAdmin();

const { data: userPackages, error } = await supabase
      .from('user_packages')
      .select(`
        amount,
        purchased_at,
        packages!inner (
          name
        )
      `)
      .gte('purchased_at', dateRange.dateFrom)
      .lte('purchased_at', dateRange.dateTo);

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
        // Verify admin access
    await requireAdmin();

const { data: transactions, error } = await supabase
      .from('mlm_transactions')
      .select('transaction_type, amount, user_id, created_at')
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income', 'rank_bonus', 'roi_income'])
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo);

    if (error) throw error;

    // Group by type
    const grouped = transactions?.reduce((acc: any, txn) => {
      const type = txn.transaction_type;
      if (!acc[type]) {
        acc[type] = { Type: type, Count: 0, TotalAmount: 0, UniqueUsers: new Set() };
      }
      acc[type].Count++;
      acc[type].TotalAmount += txn.amount;
      acc[type].UniqueUsers.add(txn.user_id);
      return acc;
    }, {});

    // Convert to array and format
    return Object.values(grouped || {}).map((row: any) => ({
      Type: row.Type,
      Count: row.Count,
      TotalAmount: row.TotalAmount,
      UniqueUsers: row.UniqueUsers.size,
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
    await requireAdmin();

const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select('amount, status, created_at, approved_at, rejected_at')
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo);

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
    await requireAdmin();

const { data: userPackages, error } = await supabase
      .from('user_packages')
      .select(`
        amount,
        roi_earned,
        is_active,
        purchased_at,
        packages!inner (
          name
        )
      `)
      .gte('purchased_at', dateRange.dateFrom)
      .lte('purchased_at', dateRange.dateTo);

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
    await requireAdmin();

const { data: achievements, error } = await supabase
      .from('rank_achievements')
      .select('rank, reward_amount, achieved_at, user_id')
      .gte('achieved_at', dateRange.dateFrom)
      .lte('achieved_at', dateRange.dateTo);

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
    await requireAdmin();

// Get all users who registered in date range
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, sponsor_id, direct_count, team_count, total_investment, total_earnings, created_at')
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo)
      .order('team_count', { ascending: false })
      .limit(50); // Top 50 performers

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
    await requireAdmin();

const { data: kycSubmissions, error } = await supabase
      .from('kyc_submissions')
      .select('status, submitted_at, reviewed_at')
      .gte('submitted_at', dateRange.dateFrom)
      .lte('submitted_at', dateRange.dateTo);

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
    await requireAdmin();

// Get user activity from transactions
    const { data: transactions, error } = await supabase
      .from('mlm_transactions')
      .select('user_id, created_at')
      .gte('created_at', dateRange.dateFrom)
      .lte('created_at', dateRange.dateTo);

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
    await requireAdmin();

// Get last 7 months of data
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
      const { data: packages } = await supabase
        .from('user_packages')
        .select('amount')
        .gte('purchased_at', start.toISOString())
        .lte('purchased_at', end.toISOString());

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
    await requireAdmin();

// Get package sales (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);

    const { data: packages } = await supabase
      .from('user_packages')
      .select('amount')
      .gte('purchased_at', thirtyDaysAgo.toISOString());

    const packageSales = packages?.reduce((sum, pkg) => sum + pkg.amount, 0) || 0;

    // Get commission payouts
    const { data: commissions } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income'])
      .gte('created_at', thirtyDaysAgo.toISOString());

    const commissionPayouts = commissions?.reduce((sum, txn) => sum + txn.amount, 0) || 0;

    // Get withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('status', 'approved')
      .gte('created_at', thirtyDaysAgo.toISOString());

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
    await requireAdmin();

const { data: userPackages } = await supabase
      .from('user_packages')
      .select(`
        amount,
        packages!inner (
          name
        )
      `);

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
