import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { Button, Card } from '../../components/ui/DesignSystem';
import { getUserDashboard, getTransactionHistory } from '../../services/mlm-client';
import { getTeamMembers } from '../../services/team.service';
import { useAuth } from "../../context/AuthContext";

// Report types
type ReportType = 'earnings' | 'referrals' | 'team' | 'roi' | 'commissions';
type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all';
type ExportFormat = 'csv' | 'pdf' | 'excel';

interface EarningsData {
  date: string;
  total: number;
  roi: number;
  commission: number;
  binary: number;
  rankBonus: number;
}

interface TeamPerformer {
  id: string;
  name: string;
  rank: string;
  earnings: number;
  team: number;
  avatar?: string;
}

interface Activity {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('earnings');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TeamPerformer[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Fetch real data
  useEffect(() => {
    const fetchReportData = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available');
        return;
      }

      console.log('📊 Fetching report data for user:', user.email);
      setLoading(true);
      setError(null);

      try {
        // Add 10-second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        const [transactions, teamMembers] = await Promise.race([
          Promise.all([
            getTransactionHistory(1000, 0),
            getTeamMembers(user.id)
          ]),
          timeoutPromise
        ]) as any[];

        console.log('✅ Transactions:', transactions?.length || 0);
        console.log('✅ Team members:', teamMembers?.length || 0);

        // Map transaction types
        const mapTransactionType = (txType: string): string => {
          if (txType === 'roi_income') return 'ROI';
          if (txType === 'direct_commission') return 'Commission';
          if (txType === 'level_income') return 'Commission';
          if (txType === 'matching_bonus' || txType === 'binary_bonus') return 'Binary';
          if (txType === 'rank_reward') return 'Rank Bonus';
          return 'Other';
        };

        // Group transactions by date for earnings data
        const transactionsByDate: Record<string, EarningsData> = {};
        (transactions || []).forEach((tx: any) => {
          const date = tx.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
          if (!transactionsByDate[date]) {
            transactionsByDate[date] = {
              date,
              total: 0,
              roi: 0,
              commission: 0,
              binary: 0,
              rankBonus: 0
            };
          }

          const amount = parseFloat(tx.amount) || 0;
          transactionsByDate[date].total += amount;

          const type = mapTransactionType(tx.transaction_type);
          if (type === 'ROI') transactionsByDate[date].roi += amount;
          else if (type === 'Commission') transactionsByDate[date].commission += amount;
          else if (type === 'Binary') transactionsByDate[date].binary += amount;
          else if (type === 'Rank Bonus') transactionsByDate[date].rankBonus += amount;
        });

        // Convert to array and sort by date
        const earningsArray = Object.values(transactionsByDate).sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setEarningsData(earningsArray);

        // Transform recent activities (last 5 transactions)
        const activities = (transactions || []).slice(0, 5).map((tx: any) => ({
          id: tx.id,
          date: tx.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          type: mapTransactionType(tx.transaction_type),
          description: tx.description || tx.transaction_type.replace('_', ' '),
          amount: parseFloat(tx.amount) || 0
        }));

        setRecentActivities(activities);

        // Transform top team performers (top 5 by earnings)
        const performers = (teamMembers || [])
          .slice(0, 5)
          .map((member: any, index: number) => ({
            id: member.id || `${index}`,
            name: member.name || member.email || 'Unknown',
            rank: member.rank || 'Member',
            earnings: member.total_earnings || 0,
            team: member.team_size || 0
          }));

        setTopPerformers(performers);

        console.log('✅ Report data loaded successfully');

      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load report data';
        setError(errorMessage);
        console.error('❌ Error loading report data:', errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user?.id]);

  // Earnings breakdown for pie chart
  const earningsBreakdown = useMemo(() => {
    const totals = earningsData.reduce(
      (acc, day) => ({
        roi: acc.roi + day.roi,
        commission: acc.commission + day.commission,
        binary: acc.binary + day.binary,
        rankBonus: acc.rankBonus + day.rankBonus,
      }),
      { roi: 0, commission: 0, binary: 0, rankBonus: 0 }
    );

    return [
      { name: 'ROI', value: totals.roi, color: '#10b981', percentage: 53 },
      { name: 'Commission', value: totals.commission, color: '#00C7D1', percentage: 27 },
      { name: 'Binary', value: totals.binary, color: '#667eea', percentage: 13 },
      { name: 'Rank Bonus', value: totals.rankBonus, color: '#f59e0b', percentage: 7 },
    ];
  }, []);


  // Calculate metrics based on date range
  const metrics = useMemo(() => {
    const filteredData = earningsData;
    const totalEarnings = filteredData.reduce((sum, day) => sum + day.total, 0);
    const roiEarnings = filteredData.reduce((sum, day) => sum + day.roi, 0);
    const commissionEarnings = filteredData.reduce((sum, day) => sum + day.commission, 0);
    const newTeamMembers = topPerformers.length;

    // Calculate growth percentage (compare current vs previous period)
    const halfPoint = Math.floor(filteredData.length / 2);
    const currentPeriod = filteredData.slice(0, halfPoint);
    const previousPeriod = filteredData.slice(halfPoint);
    const currentTotal = currentPeriod.reduce((sum, day) => sum + day.total, 0);
    const previousTotal = previousPeriod.reduce((sum, day) => sum + day.total, 0);
    const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      totalEarnings,
      roiEarnings,
      commissionEarnings,
      newTeamMembers,
      growth: Math.round(growth * 10) / 10,
    };
  }, [dateRange, earningsData, topPerformers]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.loading('Generating report...', { id: 'generate' });

    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`, { id: 'generate' });
    }, 1500);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    toast.loading(`Exporting as ${format.toUpperCase()}...`, { id: 'export' });

    // Simulate export
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Report exported as ${format.toUpperCase()} successfully!`, { id: 'export' });

      // In real app, trigger download
      const filename = `${reportType}-report-${dateRange}-${format}`;
      console.log('Exporting:', filename);
    }, 1500);
  };

  const getRankBadgeColor = (rank: string) => {
    const colors: Record<string, string> = {
      Platinum: 'from-[#e5e7eb] to-[#9ca3af]',
      Gold: 'from-[#fbbf24] to-[#f59e0b]',
      Silver: 'from-[#cbd5e1] to-[#94a3b8]',
      Bronze: 'from-[#d97706] to-[#92400e]',
    };
    return colors[rank] || 'from-[#475569] to-[#334155]';
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      ROI: '📈',
      Commission: '💰',
      Binary: '🔄',
      'Rank Bonus': '🏆',
      Deposit: '⬇️',
      Withdraw: '⬆️',
    };
    return icons[type] || '💵';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="bg-red-900/20 border-red-500 p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load Reports</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-5 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">Reports & Analytics</h1>
        <p className="text-[#94a3b8]">Comprehensive insights into your performance</p>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6 bg-[#1e293b]">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-4 py-2 bg-[#334155] text-[#f8fafc] rounded-lg border border-[#475569] focus:border-[#00C7D1] focus:outline-none transition-colors"
            >
              <option value="earnings">Earnings Report</option>
              <option value="referrals">Referral Report</option>
              <option value="team">Team Performance</option>
              <option value="roi">ROI Analysis</option>
              <option value="commissions">Commission Breakdown</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-4 py-2 bg-[#334155] text-[#f8fafc] rounded-lg border border-[#475569] focus:border-[#00C7D1] focus:outline-none transition-colors"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  📊 Generate
                </>
              )}
            </Button>

            <div className="relative group">
              <Button
                variant="success"
                size="md"
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                📥 Export
              </Button>

              {/* Export dropdown */}
              <div className="absolute top-full right-0 mt-2 w-40 bg-[#334155] rounded-lg shadow-xl border border-[#475569] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-[#f8fafc] hover:bg-[#475569] rounded-t-lg transition-colors"
                  disabled={isExporting}
                >
                  📄 Export CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left text-[#f8fafc] hover:bg-[#475569] transition-colors"
                  disabled={isExporting}
                >
                  📊 Export Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-[#f8fafc] hover:bg-[#475569] rounded-b-lg transition-colors"
                  disabled={isExporting}
                >
                  📑 Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gradient-to-br from-[#10b981] to-[#059669]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/90 font-medium text-sm">Total Earnings</h3>
            <div className="text-3xl">💰</div>
          </div>
          <p className="text-3xl font-bold text-white mb-2">${metrics.totalEarnings.toLocaleString()}</p>
          <p className="text-white/80 text-sm">+{metrics.growth}% from last period</p>
        </Card>

        <Card className="bg-gradient-to-br from-[#00C7D1] to-[#0891b2]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/90 font-medium text-sm">ROI Earnings</h3>
            <div className="text-3xl">📈</div>
          </div>
          <p className="text-3xl font-bold text-white mb-2">${metrics.roiEarnings.toLocaleString()}</p>
          <p className="text-white/80 text-sm">+18.2% from last period</p>
        </Card>

        <Card className="bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/90 font-medium text-sm">Commission</h3>
            <div className="text-3xl">🤝</div>
          </div>
          <p className="text-3xl font-bold text-white mb-2">${metrics.commissionEarnings.toLocaleString()}</p>
          <p className="text-white/80 text-sm">+32.5% from last period</p>
        </Card>

        <Card className="bg-gradient-to-br from-[#667eea] to-[#764ba2]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/90 font-medium text-sm">New Team Members</h3>
            <div className="text-3xl">👥</div>
          </div>
          <p className="text-3xl font-bold text-white mb-2">{metrics.newTeamMembers}</p>
          <p className="text-white/80 text-sm">+{metrics.newTeamMembers} from last period</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Chart */}
        <Card className="bg-[#1e293b]">
          <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Performance Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Total Earnings"
                />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="#00C7D1"
                  strokeWidth={2}
                  dot={{ fill: '#00C7D1', r: 3 }}
                  name="ROI"
                />
                <Line
                  type="monotone"
                  dataKey="commission"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  name="Commission"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Earnings Breakdown Pie Chart */}
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
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {earningsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Earnings Breakdown Table */}
      <Card className="mb-6 bg-[#1e293b]">
        <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Earnings Breakdown Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#334155]">
                <th className="px-4 py-3 text-left text-[#cbd5e1] font-semibold">Source</th>
                <th className="px-4 py-3 text-right text-[#cbd5e1] font-semibold">Amount</th>
                <th className="px-4 py-3 text-right text-[#cbd5e1] font-semibold">Percentage</th>
                <th className="px-4 py-3 text-center text-[#cbd5e1] font-semibold">Trend</th>
              </tr>
            </thead>
            <tbody>
              {earningsBreakdown.map((item, index) => (
                <tr key={index} className="border-b border-[#334155] hover:bg-[#334155] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#f8fafc] font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[#f8fafc] font-bold">
                    ${item.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[#94a3b8]">
                    {item.percentage}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[#10b981] flex items-center justify-center gap-1">
                      ↑ <span className="text-sm">+{Math.floor(Math.random() * 20 + 10)}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="bg-[#1e293b]">
          <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div
                key={performer.id}
                className="flex items-center gap-4 p-3 bg-[#334155] rounded-lg hover:bg-[#475569] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl font-bold text-[#94a3b8]">#{index + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white font-bold">
                    {performer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[#f8fafc] font-medium">{performer.name}</p>
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r ${getRankBadgeColor(performer.rank)} text-white`}>
                      {performer.rank}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#10b981] font-bold text-lg">${performer.earnings.toLocaleString()}</p>
                  <p className="text-[#94a3b8] text-sm">{performer.team} team members</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#1e293b]">
          <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 bg-[#334155] rounded-lg hover:bg-[#475569] transition-colors"
              >
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <p className="text-[#f8fafc] font-medium">{activity.description}</p>
                  <p className="text-xs text-[#94a3b8]">{format(new Date(activity.date), 'MMM dd, yyyy')}</p>
                </div>
                <p className="text-[#10b981] font-bold text-lg">+${activity.amount}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
