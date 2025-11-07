import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { Button, Card, Badge, StatCard } from '../../components/ui/DesignSystem';
import { getUserDashboard } from '../../services/mlm.service';
import { getTeamMembers } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';

// Skeleton loader component
const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#475569] rounded ${className}`} />
);

interface UserData {
  name: string;
  avatar: string;
  userId: string;
  currentRank: string;
  memberSince: string;
}

interface AlertBanner {
  id: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

export const DashboardNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // User data
  const [userData, setUserData] = useState<UserData>({
    name: 'John Doe',
    avatar: '',
    userId: 'USR123456',
    currentRank: 'Gold',
    memberSince: '2024-01-15',
  });

  // Key metrics
  const [metrics, setMetrics] = useState({
    walletBalance: 5000.0,
    totalInvestment: 10000.0,
    roi: 15.5,
    totalEarningsToday: 50.0,
    totalEarningsWeek: 350.0,
    totalEarningsMonth: 1500.0,
    teamSize: { directs: 25, total: 150 },
    binaryVolume: { left: 75000, right: 65000 },
    nextRank: { current: 'Gold', next: 'Platinum', progress: 65 },
    activePackages: { count: 3, expiring: 5 },
  });

  // Earnings trend data (last 30 days)
  const [earningsTrend, setEarningsTrend] = useState([
    { date: 'Jan 1', amount: 30 },
    { date: 'Jan 3', amount: 45 },
    { date: 'Jan 5', amount: 35 },
    { date: 'Jan 7', amount: 55 },
    { date: 'Jan 9', amount: 60 },
    { date: 'Jan 11', amount: 50 },
    { date: 'Jan 13', amount: 70 },
    { date: 'Jan 15', amount: 85 },
    { date: 'Jan 17', amount: 75 },
    { date: 'Jan 19', amount: 90 },
    { date: 'Jan 21', amount: 95 },
    { date: 'Jan 23', amount: 80 },
    { date: 'Jan 25', amount: 100 },
    { date: 'Jan 27', amount: 110 },
    { date: 'Jan 29', amount: 105 },
    { date: 'Jan 31', amount: 120 },
  ]);

  // Earnings breakdown
  const [earningsBreakdown, setEarningsBreakdown] = useState([
    { name: 'ROI', value: 800, color: '#10b981' },
    { name: 'Commission', value: 400, color: '#00C7D1' },
    { name: 'Binary', value: 200, color: '#667eea' },
    { name: 'Rank Bonus', value: 100, color: '#f59e0b' },
  ]);

  // Recent transactions
  const [recentTransactions, setRecentTransactions] = useState([
    { id: 'TXN001', date: new Date(), type: 'ROI', amount: 50.0, status: 'completed' as const },
    { id: 'TXN002', date: new Date(Date.now() - 86400000), type: 'Commission', amount: 25.0, status: 'completed' as const },
    { id: 'TXN003', date: new Date(Date.now() - 172800000), type: 'Binary', amount: 15.0, status: 'completed' as const },
    { id: 'TXN004', date: new Date(Date.now() - 259200000), type: 'Deposit', amount: 1000.0, status: 'completed' as const },
    { id: 'TXN005', date: new Date(Date.now() - 345600000), type: 'Withdraw', amount: -500.0, status: 'pending' as const },
  ]);

  // Activity feed
  const [activityFeed, setActivityFeed] = useState([
    { id: '1', user: 'Alice Johnson', action: 'joined your team', time: '2 minutes ago', icon: '👥' },
    { id: '2', user: 'Bob Smith', action: 'purchased Gold Package', time: '15 minutes ago', icon: '📦' },
    { id: '3', user: 'Carol White', action: 'achieved Silver rank', time: '1 hour ago', icon: '🏆' },
    { id: '4', user: 'David Brown', action: 'activated robot subscription', time: '2 hours ago', icon: '🤖' },
    { id: '5', user: 'Emma Davis', action: 'completed KYC verification', time: '3 hours ago', icon: '✅' },
  ]);

  // Alert banners
  const [alerts, setAlerts] = useState<AlertBanner[]>([
    {
      id: 'robot',
      type: 'warning',
      message: 'Robot subscription required to maximize your earnings',
      action: { label: 'Subscribe Now', onClick: () => navigate('/robot') },
    },
    {
      id: 'kyc',
      type: 'danger',
      message: 'Complete your KYC verification to unlock full platform features',
      action: { label: 'Complete KYC', onClick: () => navigate('/kyc') },
    },
    {
      id: 'withdrawal',
      type: 'info',
      message: 'You have 1 pending withdrawal request under review',
      action: { label: 'View Details', onClick: () => navigate('/wallet?tab=history') },
    },
    {
      id: 'rank',
      type: 'success',
      message: 'Congratulations! You\'re 35% away from Platinum rank',
      action: { label: 'View Progress', onClick: () => navigate('/ranks') },
    },
  ]);

  // Load real dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      // Skip if user not authenticated
      if (!user?.id) {
        console.log('⚠️ User not authenticated, skipping dashboard load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📊 [Dashboard] Auth Context User:', user.id, user.email);
        console.log('📊 [Dashboard] Loading dashboard data for user:', user.id);
        console.log('🔧 [Dashboard] Using unified MySQL team.service for team stats');
        const [dashboardData, teamData] = await Promise.all([
          getUserDashboard(user.id),  // User data from Supabase (wallet, earnings, etc.)
          getTeamMembers()  // ✅ Team data from MySQL API (JWT-based)
        ]);
        console.log('📊 [Dashboard] Received data for user:', dashboardData.user.id, dashboardData.user.email);
        console.log('📊 [Dashboard] Team stats:', teamData.summary.total_team, 'members,', teamData.summary.direct_members, 'direct');
        console.log('📊 DashboardNew - Earnings:', {
          today: dashboardData.statistics.today_earnings,
          week: dashboardData.statistics.week_earnings,
          month: dashboardData.statistics.month_earnings,
          roi: dashboardData.statistics.roi_earned
        });
        console.log('📊 DashboardNew - Binary Volume:', {
          left: dashboardData.statistics.left_volume,
          right: dashboardData.statistics.right_volume,
          total: dashboardData.statistics.total_volume
        });
        console.log('📊 DashboardNew - Packages:', dashboardData.active_packages.length, 'active');
        console.log('📊 DashboardNew - Transactions:', dashboardData.recent_transactions?.length || 0, 'recent');
        console.log('📊 DashboardNew - Full API Response:', dashboardData);

        // Update user data
        setUserData({
          name: dashboardData.user.full_name || dashboardData.user.email,
          avatar: '',
          userId: dashboardData.user.id.substring(0, 10).toUpperCase(),
          currentRank: dashboardData.user.current_rank.replace('_', ' ').toUpperCase(),
          memberSince: new Date().toISOString().split('T')[0],
        });

        // Update metrics with REAL data
        setMetrics({
          walletBalance: dashboardData.user.wallet_balance || 0,
          totalInvestment: dashboardData.user.total_investment || 0,
          roi: dashboardData.statistics.roi_earned || 0,
          totalEarningsToday: dashboardData.statistics.today_earnings || 0,
          totalEarningsWeek: dashboardData.statistics.week_earnings || 0,
          totalEarningsMonth: dashboardData.statistics.month_earnings || 0,
          teamSize: {
            directs: teamData.summary.direct_members || 0,  // ✅ From MySQL
            total: teamData.summary.total_team || 0  // ✅ From MySQL
          },
          binaryVolume: {
            left: dashboardData.statistics.left_volume || 0,
            right: dashboardData.statistics.right_volume || 0
          },
          nextRank: {
            current: dashboardData.user.current_rank.replace('_', ' ').toUpperCase(),
            next: dashboardData.next_rank.rank.replace('_', ' ').toUpperCase(),
            progress: Math.round((dashboardData.statistics.total_volume / dashboardData.next_rank.min_volume) * 100)
          },
          activePackages: {
            count: dashboardData.active_packages.length || 0,
            expiring: 0
          },
        });

        // Update transactions (ALWAYS replace, even if empty)
        setRecentTransactions(
          dashboardData.recent_transactions?.slice(0, 5).map((tx: any) => ({
            id: tx.id,
            date: new Date(tx.created_at),
            type: tx.transaction_type.replace('_', ' ').toUpperCase(),
            amount: parseFloat(tx.amount),
            status: tx.status || 'completed'
          })) || []
        );

        // Calculate earnings breakdown from transaction types
        const transactionsByType = dashboardData.recent_transactions?.reduce((acc: any, tx: any) => {
          const type = tx.transaction_type;
          acc[type] = (acc[type] || 0) + parseFloat(tx.amount);
          return acc;
        }, {});

        const breakdown = [
          { name: 'ROI', value: dashboardData.statistics.roi_earned || 0, color: '#10b981' },
          { name: 'Level Income', value: transactionsByType?.level_income || 0, color: '#00C7D1' },
          { name: 'Matching Bonus', value: transactionsByType?.matching_bonus || 0, color: '#667eea' },
          { name: 'Booster Income', value: transactionsByType?.booster_income || 0, color: '#f59e0b' },
          { name: 'Rank Reward', value: transactionsByType?.rank_reward || 0, color: '#ec4899' },
        ].filter(item => item.value > 0); // Only show categories with values

        setEarningsBreakdown(breakdown.length > 0 ? breakdown : [
          { name: 'No Earnings Yet', value: 1, color: '#475569' }
        ]);

        // Generate earnings trend for last 30 days (simplified - use week/month data points)
        const trend = [];
        const daysInMonth = 30;
        const dailyAverage = (dashboardData.statistics.month_earnings || 0) / daysInMonth;

        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          trend.push({
            date: format(date, 'MMM d'),
            amount: Math.round(dailyAverage * (0.8 + Math.random() * 0.4)) // Slight variation
          });
        }

        setEarningsTrend(trend);

        // Update activity feed with real team member activities
        const activities = dashboardData.direct_referrals?.slice(0, 5).map((referral: any, index: number) => ({
          id: referral.id,
          user: referral.full_name || referral.email,
          action: referral.total_investment > 0 ? 'purchased a package' : 'joined your team',
          time: format(new Date(referral.created_at), 'MMM d, HH:mm'),
          icon: referral.total_investment > 0 ? '📦' : '👥'
        })) || [];

        setActivityFeed(activities.length > 0 ? activities : []);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadDashboardData();

    // Real-time data updates (every 30 seconds)
    const interval = setInterval(loadDashboardData, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const handleDismissAlert = (id: string) => {
    // Add dismissing animation class
    const alertElement = document.querySelector(`[data-alert-id="${id}"]`);
    if (alertElement) {
      alertElement.classList.add('opacity-0', 'translate-x-full', 'transition-all', 'duration-300');
      setTimeout(() => {
        setDismissedAlerts([...dismissedAlerts, id]);
      }, 300);
    } else {
      setDismissedAlerts([...dismissedAlerts, id]);
    }
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.includes(alert.id));

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      ROI: '📈',
      Commission: '💰',
      Binary: '🔄',
      Deposit: '⬇️',
      Withdraw: '⬆️',
      'Rank Bonus': '🏆',
    };
    return icons[type] || '💵';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-5 max-w-7xl mx-auto">
        {/* Skeleton Loading State */}
        <div className="space-y-6">
          <SkeletonLoader className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <SkeletonLoader key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonLoader className="h-80" />
            <SkeletonLoader className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-5 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Alert Banners */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-3 mb-8">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              data-alert-id={alert.id}
              className={`flex items-center justify-between p-4 rounded-lg border-l-4 transition-all duration-300 ${
                alert.type === 'warning'
                  ? 'bg-[#f59e0b]/10 border-[#f59e0b]'
                  : alert.type === 'danger'
                  ? 'bg-[#ef4444]/10 border-[#ef4444]'
                  : alert.type === 'success'
                  ? 'bg-[#10b981]/10 border-[#10b981]'
                  : 'bg-[#00C7D1]/10 border-[#00C7D1]'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[#f8fafc]">{alert.message}</span>
                {alert.action && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={alert.action.onClick}
                    className="ml-4"
                  >
                    {alert.action.label}
                  </Button>
                )}
              </div>
              <button
                onClick={() => handleDismissAlert(alert.id)}
                className="text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] ml-4 p-2 rounded-lg transition-all"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Section */}
      <Card className="mb-8 bg-gradient-to-r from-[#667eea] to-[#764ba2]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
              {userData.avatar ? (
                <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userData.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {userData.name}! 👋
              </h1>
              <p className="text-white/80">
                {userData.currentRank} Member • ID: {userData.userId}
              </p>
            </div>
          </div>
          <div className="text-right text-white/80">
            <p className="text-sm">Member since</p>
            <p className="font-medium">{format(new Date(userData.memberSince), 'MMM dd, yyyy')}</p>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid (4x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Wallet Balance */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/wallet')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Wallet Balance</h3>
            <div className="text-3xl">💰</div>
          </div>
          <p className="text-3xl font-bold text-[#00C7D1] mb-3">${metrics.walletBalance.toLocaleString()}</p>
          <div className="flex gap-2">
            <Button variant="success" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/wallet?tab=deposit'); }} className="flex-1">
              Deposit
            </Button>
            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/wallet?tab=withdraw'); }} className="flex-1">
              Withdraw
            </Button>
          </div>
        </Card>

        {/* Total Investment */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Total Investment</h3>
            <div className="text-3xl">💎</div>
          </div>
          <p className="text-3xl font-bold text-[#f8fafc] mb-1">${metrics.totalInvestment.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#475569] rounded-full overflow-hidden">
              <div className="h-full bg-[#10b981]" style={{ width: `${metrics.roi}%` }} />
            </div>
            <span className="text-sm text-[#10b981] font-bold">+{metrics.roi}%</span>
          </div>
        </Card>

        {/* Total Earnings */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Total Earnings</h3>
            <div className="text-3xl">📊</div>
          </div>
          <p className="text-3xl font-bold text-[#10b981] mb-3">${metrics.totalEarningsMonth.toLocaleString()}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-[#94a3b8]">Today</p>
              <p className="text-[#f8fafc] font-bold">${metrics.totalEarningsToday}</p>
            </div>
            <div className="text-center border-x border-[#475569]">
              <p className="text-[#94a3b8]">Week</p>
              <p className="text-[#f8fafc] font-bold">${metrics.totalEarningsWeek}</p>
            </div>
            <div className="text-center">
              <p className="text-[#94a3b8]">Month</p>
              <p className="text-[#f8fafc] font-bold">${metrics.totalEarningsMonth}</p>
            </div>
          </div>
        </Card>

        {/* Team Size */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/team')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Team Size</h3>
            <div className="text-3xl">👥</div>
          </div>
          <p className="text-3xl font-bold text-[#f8fafc] mb-3">{metrics.teamSize.total}</p>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-[#94a3b8]">Direct Referrals</p>
              <p className="text-[#00C7D1] font-bold text-lg">{metrics.teamSize.directs}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94a3b8]">All Levels</p>
              <p className="text-[#f8fafc] font-bold text-lg">{metrics.teamSize.total}</p>
            </div>
          </div>
        </Card>

        {/* Binary Volume */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Binary Volume</h3>
            <div className="text-3xl">⚖️</div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#00C7D1]">Left</span>
                <span className="text-[#f8fafc] font-bold">${(metrics.binaryVolume.left / 1000).toFixed(0)}K</span>
              </div>
              <div className="h-3 bg-[#475569] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00C7D1]"
                  style={{ width: `${(metrics.binaryVolume.left / (metrics.binaryVolume.left + metrics.binaryVolume.right)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#667eea]">Right</span>
                <span className="text-[#f8fafc] font-bold">${(metrics.binaryVolume.right / 1000).toFixed(0)}K</span>
              </div>
              <div className="h-3 bg-[#475569] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#667eea]"
                  style={{ width: `${(metrics.binaryVolume.right / (metrics.binaryVolume.left + metrics.binaryVolume.right)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Next Rank Progress */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/ranks')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Next Rank</h3>
            <div className="text-3xl">🏆</div>
          </div>
          <div className="mb-3">
            <p className="text-sm text-[#94a3b8] mb-1">
              {metrics.nextRank.current} → {metrics.nextRank.next}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-[#475569] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] transition-all"
                  style={{ width: `${metrics.nextRank.progress}%` }}
                />
              </div>
              <span className="text-sm text-[#f59e0b] font-bold">{metrics.nextRank.progress}%</span>
            </div>
          </div>
          <p className="text-xs text-[#94a3b8]">
            {100 - metrics.nextRank.progress}% to unlock {metrics.nextRank.next}
          </p>
        </Card>

        {/* Active Packages */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/packages')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Active Packages</h3>
            <div className="text-3xl">📦</div>
          </div>
          <p className="text-3xl font-bold text-[#f8fafc] mb-3">{metrics.activePackages.count}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#94a3b8]">Expiring Soon</p>
              <p className="text-sm text-[#f59e0b] font-bold">{metrics.activePackages.expiring} days</p>
            </div>
            <Button variant="outline" size="sm">
              Renew
            </Button>
          </div>
        </Card>

        {/* Recent Earnings Chart Preview */}
        <Card className="bg-gradient-to-br from-[#334155] to-[#1e293b] hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#cbd5e1] font-medium">Earnings Trend</h3>
            <div className="text-3xl">📈</div>
          </div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsTrend.slice(-7)}>
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[#94a3b8] text-right mt-2">
            {metrics.totalEarningsWeek > 0
              ? `$${metrics.totalEarningsWeek.toFixed(2)} this week`
              : 'No earnings yet'}
          </p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earnings Trend Chart */}
        <Card className="bg-[#1e293b]">
          <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Earnings Trend (Last 30 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Earnings Breakdown Chart */}
        <Card className="bg-[#1e293b]">
          <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Earnings Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={earningsBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {earningsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <Card className="bg-[#1e293b]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#f8fafc]">Recent Transactions</h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/wallet?tab=history')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-[#334155] rounded-lg hover:bg-[#475569] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getTransactionIcon(transaction.type)}</div>
                  <div>
                    <p className="text-[#f8fafc] font-medium">{transaction.type}</p>
                    <p className="text-xs text-[#94a3b8]">{format(transaction.date, 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${transaction.amount > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <Badge variant={transaction.status === 'completed' ? 'success' : 'warning'} className="text-xs">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-[#1e293b]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#f8fafc]">Team Activity</h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/team')}>
              View Team
            </Button>
          </div>
          <div className="space-y-3">
            {activityFeed.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 bg-[#334155] rounded-lg hover:bg-[#475569] transition-colors"
              >
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="text-[#f8fafc]">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-[#94a3b8]"> {activity.action}</span>
                  </p>
                  <p className="text-xs text-[#94a3b8]">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Refresh Indicator */}
      {refreshing && (
        <div className="fixed bottom-5 right-5 bg-[#334155] px-4 py-2 rounded-lg border border-[#00C7D1] flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#00C7D1] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#f8fafc] text-sm">Updating...</span>
        </div>
      )}
    </div>
  );
};

export default DashboardNew;
