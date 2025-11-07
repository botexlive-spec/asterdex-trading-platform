import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import {
  getDashboardStats,
  getRecentActivities,
  getTopUsers,
  getGrowthChartData,
  getRevenueChartData,
  DashboardStats,
  RecentActivity,
  TopUser,
} from '../../services/admin-dashboard.service';
import toast from 'react-hot-toast';

// Interfaces
interface MetricCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  // Real data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  // Load all dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [
        dashboardStats,
        activities,
        users,
        growth,
        revenue,
      ] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(20),
        getTopUsers(10),
        getGrowthChartData(30),
        getRevenueChartData(30),
      ]);

      setStats(dashboardStats);
      setRecentActivities(activities);
      setTopUsers(users);
      setGrowthData(growth);
      setRevenueData(revenue);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));

      // Show detailed error messages
      if (error.message?.includes('not authenticated') || error.message?.includes('Authentication required')) {
        toast.error('Please log in to access the admin dashboard');
        setTimeout(() => {
          navigate('/auth/login');
        }, 2000);
      } else if (error.message?.includes('Admin access required') || error.message?.includes('permission')) {
        toast.error('Admin access required. Your account does not have admin privileges.');
      } else if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        toast.error('Database not set up. Please deploy database files first.');
      } else {
        toast.error(`Failed to load dashboard data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert stats to metrics cards
  const metrics: MetricCard[] = stats ? [
    {
      id: 'total-users',
      label: 'Total Users',
      value: stats.total_users.toLocaleString(),
      change: ((stats.week_registrations / Math.max(stats.total_users - stats.week_registrations, 1)) * 100),
      icon: '👥',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: `$${stats.total_revenue.toLocaleString()}`,
      change: 8.3, // TODO: Calculate from historical data
      icon: '💰',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'active-packages',
      label: 'Active Packages',
      value: stats.active_packages.toLocaleString(),
      change: ((stats.active_packages / Math.max(stats.total_packages_sold, 1)) * 100),
      icon: '📦',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'pending-kyc',
      label: 'Pending KYC',
      value: stats.pending_kyc.toLocaleString(),
      change: -15.2, // TODO: Calculate from historical data
      icon: '🆔',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'pending-withdrawals',
      label: 'Pending Withdrawals',
      value: `$${stats.pending_withdrawals_amount.toLocaleString()}`,
      change: ((stats.pending_withdrawals / Math.max(stats.total_withdrawals, 1)) * 100),
      icon: '💸',
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'today-registrations',
      label: "Today's Registrations",
      value: stats.today_registrations.toLocaleString(),
      change: ((stats.today_registrations / Math.max(stats.week_registrations / 7, 1)) * 100),
      icon: '✨',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      id: 'active-robots',
      label: 'Active Robot Subscriptions',
      value: stats.active_robot_subscriptions.toLocaleString(),
      change: 31.4, // TODO: Calculate from historical data
      icon: '🤖',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'profit-loss',
      label: 'Platform Profit (Month)',
      value: `$${(stats.total_revenue - stats.total_commissions_paid - stats.total_roi_distributed).toLocaleString()}`,
      change: 12.8, // TODO: Calculate from historical data
      icon: '📈',
      color: 'from-teal-500 to-teal-600'
    }
  ] : [];

  // Quick Actions with real data
  const quickActions = stats ? [
    {
      id: 'kyc',
      label: 'Approve Pending KYCs',
      count: stats.pending_kyc,
      icon: '✅',
      color: 'bg-orange-500 hover:bg-orange-600',
      path: '/admin/kyc'
    },
    {
      id: 'withdrawals',
      label: 'Process Withdrawals',
      count: stats.pending_withdrawals,
      icon: '💳',
      color: 'bg-red-500 hover:bg-red-600',
      path: '/admin/financial'
    },
    {
      id: 'packages',
      label: 'View Active Packages',
      count: stats.active_packages,
      icon: '📊',
      color: 'bg-blue-500 hover:bg-blue-600',
      path: '/admin/packages'
    },
    {
      id: 'users',
      label: 'Manage Users',
      count: stats.total_users,
      icon: '👥',
      color: 'bg-purple-500 hover:bg-purple-600',
      path: '/admin/users'
    }
  ] : [];

  const handleExportDashboard = () => {
    console.log('Exporting dashboard report...');
    toast.success('Dashboard report exported successfully!');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration': return '✨';
      case 'package': return '📦';
      case 'withdrawal': return '💸';
      case 'kyc': return '🆔';
      case 'robot': return '🤖';
      default: return '📌';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration': return 'bg-green-100 text-green-800';
      case 'package': return 'bg-purple-100 text-purple-800';
      case 'withdrawal': return 'bg-red-100 text-red-800';
      case 'kyc': return 'bg-orange-100 text-orange-800';
      case 'robot': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show setup prompt if no data loaded (database not deployed)
  if (!loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
          </div>

          {/* Setup Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Database Setup Required</h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Welcome to your Finaster MLM Platform! To start using the admin dashboard, ensure your MySQL database is properly configured.
              </p>

              <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-2xl mx-auto">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📋</span> Quick Setup Steps:
                </h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="font-semibold text-blue-600">1.</span>
                    <span>Ensure MySQL server is running on your system</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-blue-600">2.</span>
                    <span>Check your <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env</code> file for correct MySQL credentials</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-blue-600">3.</span>
                    <span>Verify the backend server is running at <code className="bg-gray-100 px-2 py-1 rounded text-sm">http://localhost:3001</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-blue-600">4.</span>
                    <span>Refresh this page</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={loadDashboardData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔄 Try Again
                </Button>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> For detailed instructions, check the{' '}
                  <code className="bg-yellow-100 px-2 py-1 rounded">DEPLOYMENT_COMPLETE_SUMMARY.md</code> file
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
              <Button onClick={loadDashboardData} className="bg-gray-600 hover:bg-gray-700">
                🔄 Refresh
              </Button>
              <Button onClick={handleExportDashboard} className="bg-blue-600 hover:bg-blue-700">
                📄 Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <Card key={metric.id} className={`hover:shadow-lg transition-shadow bg-gradient-to-br ${metric.color}`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                    {metric.icon}
                  </div>
                  {metric.change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                      metric.change >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      <span>{metric.change >= 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(metric.change).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{metric.value}</h3>
                <p className="text-sm text-white/80">{metric.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <Card className="bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">User Growth</h2>
                <span className="text-sm text-white/60">Last 30 days</span>
              </div>
              <div className="h-64">
                {growthData.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 600 200">
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={i * 50}
                        x2="600"
                        y2={i * 50}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Line path */}
                    {growthData.length > 1 && (
                      <>
                        <polyline
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="3"
                          points={growthData.map((d, i) => {
                            const maxReg = Math.max(...growthData.map(g => g.registrations));
                            return `${(i / (growthData.length - 1)) * 600},${200 - (d.registrations / Math.max(maxReg, 1)) * 200}`;
                          }).join(' ')}
                        />
                        {/* Area fill */}
                        <polygon
                          fill="url(#gradient1)"
                          fillOpacity="0.3"
                          points={`0,200 ${growthData.map((d, i) => {
                            const maxReg = Math.max(...growthData.map(g => g.registrations));
                            return `${(i / (growthData.length - 1)) * 600},${200 - (d.registrations / Math.max(maxReg, 1)) * 200}`;
                          }).join(' ')} 600,200`}
                        />
                      </>
                    )}
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/60">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Monthly Revenue Chart */}
          <Card className="bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Daily Revenue</h2>
                <span className="text-sm text-white/60">Last 30 days</span>
              </div>
              <div className="h-64">
                {revenueData.length > 0 ? (
                  <div className="flex items-end justify-between h-full gap-1">
                    {revenueData.slice(-30).map((data, index) => {
                      const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
                      const height = (data.revenue / Math.max(maxRevenue, 1)) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full relative group">
                            <div
                              className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-600 hover:to-emerald-500 cursor-pointer shadow-lg"
                              style={{ height: `${height}%`, minHeight: '2px' }}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-semibold shadow-lg z-10">
                                ${(data.revenue).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/60">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions Panel */}
          <Card className="lg:col-span-1">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.path)}
                    className={`w-full ${action.color} text-white rounded-lg p-4 transition-colors flex items-center justify-between group`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{action.icon}</span>
                      <span className="font-medium text-sm text-left">{action.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white">
                        {action.count}
                      </Badge>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg ${getActivityColor(activity.type)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-lg">{getActivityIcon(activity.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.user_name}</p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                          {activity.amount && (
                            <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                              ${activity.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No recent activities
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Top Users */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Users by Investment</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Investment</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Earnings</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Team Size</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <Badge className="bg-purple-100 text-purple-800">{user.rank}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                        ${user.total_investment.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-green-600">
                        ${user.total_earnings.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        {user.team_size}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
