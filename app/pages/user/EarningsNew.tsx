import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getUserDashboard, getTransactionHistory } from '../../services/mlm-client';
import { useAuth } from "../../context/AuthContext";

interface EarningRecord {
  id: string;
  date: string;
  type: 'direct' | 'level' | 'binary' | 'roi' | 'rank' | 'booster';
  description: string;
  amount: number;
  fromUser?: string;
  status: 'completed' | 'pending' | 'processing';
  level?: number;
}

interface LevelIncome {
  level: number;
  commissionPercent: number;
  count: number;
  totalEarned: number;
}

const EarningsNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const itemsPerPage = 10;

  // State for real data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsOverview, setEarningsOverview] = useState({
    totalAllTime: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0,
    availableWithdrawal: 0
  });
  const [allEarnings, setAllEarnings] = useState<EarningRecord[]>([]);
  const [earningsByType, setEarningsByType] = useState([
    {
      type: 'direct',
      name: 'Direct Referral Income',
      color: 'bg-green-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    },
    {
      type: 'level',
      name: 'Level Income (Levels 1-30)',
      color: 'bg-blue-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    },
    {
      type: 'binary',
      name: 'Binary Matching Bonuses',
      color: 'bg-purple-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    },
    {
      type: 'roi',
      name: 'ROI Earnings',
      color: 'bg-yellow-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    },
    {
      type: 'rank',
      name: 'Rank Rewards',
      color: 'bg-red-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    },
    {
      type: 'booster',
      name: 'Booster Income',
      color: 'bg-indigo-500',
      totalEarned: 0,
      thisMonth: 0,
      count: 0
    }
  ]);
  const [levelIncomeData, setLevelIncomeData] = useState<LevelIncome[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<{ date: string; amount: number }[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<{ month: string; amount: number }[]>([]);

  // Fetch real earnings data
  useEffect(() => {
    const fetchEarningsData = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available');
        return;
      }

      console.log('💰 Fetching earnings data for user:', user.email);
      setLoading(true);
      setError(null);

      try {
        // Add 10-second timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        // Fetch dashboard data and transaction history in parallel
        const [dashboardData, transactions] = await Promise.race([
          Promise.all([
            getUserDashboard(user.id),
            getTransactionHistory(1000, 0) // Get last 1000 transactions
          ]),
          timeoutPromise
        ]) as any[];

        console.log('✅ Dashboard data:', dashboardData);
        console.log('✅ Transactions:', transactions?.length || 0);

        // Map transaction types to our display types
        const mapTransactionType = (txType: string): 'direct' | 'level' | 'binary' | 'roi' | 'rank' | 'booster' => {
          if (txType === 'direct_commission') return 'direct';
          if (txType === 'level_income') return 'level';
          if (txType === 'matching_bonus' || txType === 'binary_bonus') return 'binary';
          if (txType === 'roi_income') return 'roi';
          if (txType === 'rank_reward') return 'rank';
          if (txType === 'booster_income') return 'booster';
          return 'roi'; // default
        };

        // Transform transactions to earnings records
        const earningsRecords: EarningRecord[] = (transactions || []).map((tx: any) => ({
          id: tx.id,
          date: tx.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          type: mapTransactionType(tx.transaction_type),
          description: tx.description || tx.transaction_type.replace('_', ' '),
          amount: parseFloat(tx.amount) || 0,
          fromUser: tx.from_user_email || undefined,
          status: tx.status || 'completed',
          level: tx.level || undefined
        }));

        setAllEarnings(earningsRecords);

        // Calculate earnings overview
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayEarnings = earningsRecords
          .filter(e => new Date(e.date) >= startOfToday && e.status === 'completed')
          .reduce((sum, e) => sum + e.amount, 0);

        const weekEarnings = earningsRecords
          .filter(e => new Date(e.date) >= startOfWeek && e.status === 'completed')
          .reduce((sum, e) => sum + e.amount, 0);

        const monthEarnings = earningsRecords
          .filter(e => new Date(e.date) >= startOfMonth && e.status === 'completed')
          .reduce((sum, e) => sum + e.amount, 0);

        const totalEarnings = earningsRecords
          .filter(e => e.status === 'completed')
          .reduce((sum, e) => sum + e.amount, 0);

        setEarningsOverview({
          totalAllTime: totalEarnings,
          thisMonth: monthEarnings,
          thisWeek: weekEarnings,
          today: todayEarnings,
          availableWithdrawal: dashboardData.wallet_balance || 0
        });

        // Calculate earnings by type
        const updatedEarningsByType = earningsByType.map(et => {
          const typeTransactions = earningsRecords.filter(e => e.type === et.type && e.status === 'completed');
          const monthTransactions = typeTransactions.filter(e => new Date(e.date) >= startOfMonth);

          return {
            ...et,
            totalEarned: typeTransactions.reduce((sum, e) => sum + e.amount, 0),
            thisMonth: monthTransactions.reduce((sum, e) => sum + e.amount, 0),
            count: typeTransactions.length
          };
        });

        setEarningsByType(updatedEarningsByType);

        // Calculate level income data
        const levelData: LevelIncome[] = Array.from({ length: 30 }, (_, i) => {
          const level = i + 1;
          const levelTransactions = earningsRecords.filter(
            e => e.type === 'level' && e.level === level && e.status === 'completed'
          );

          return {
            level,
            commissionPercent: level <= 5 ? (10 - level + 1) : level <= 10 ? 5 : level <= 20 ? 3 : 1,
            count: levelTransactions.length,
            totalEarned: levelTransactions.reduce((sum, e) => sum + e.amount, 0)
          };
        });

        setLevelIncomeData(levelData);

        // Calculate daily earnings for last 30 days
        const dailyData = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toISOString().split('T')[0];

          const dayEarnings = earningsRecords
            .filter(e => e.date === dateStr && e.status === 'completed')
            .reduce((sum, e) => sum + e.amount, 0);

          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount: dayEarnings
          };
        });

        setDailyEarnings(dailyData);

        // Calculate monthly earnings for last 12 months
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          const year = date.getFullYear();
          const month = date.getMonth();

          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);

          const monthEarningsTotal = earningsRecords
            .filter(e => {
              const eDate = new Date(e.date);
              return eDate >= monthStart && eDate <= monthEnd && e.status === 'completed';
            })
            .reduce((sum, e) => sum + e.amount, 0);

          return {
            month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            amount: monthEarningsTotal
          };
        });

        setMonthlyEarnings(monthlyData);

        console.log('✅ Earnings data loaded successfully');

      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load earnings data';
        setError(errorMessage);
        console.error('❌ Error loading earnings:', errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, [user?.id]);

  const earningsDistribution = earningsByType.map(et => ({
    name: et.name,
    value: et.totalEarned,
    color: et.color
  }));

  // Filter and search logic
  const filteredEarnings = useMemo(() => {
    return allEarnings.filter(earning => {
      // Search filter
      if (searchTerm && !earning.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(earning.fromUser?.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && earning.type !== filterType) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && earning.status !== filterStatus) {
        return false;
      }

      // Date range filter
      if (dateFrom && earning.date < dateFrom) {
        return false;
      }
      if (dateTo && earning.date > dateTo) {
        return false;
      }

      // Amount range filter
      if (amountMin && earning.amount < parseFloat(amountMin)) {
        return false;
      }
      if (amountMax && earning.amount > parseFloat(amountMax)) {
        return false;
      }

      return true;
    });
  }, [allEarnings, searchTerm, filterType, filterStatus, dateFrom, dateTo, amountMin, amountMax]);

  // Pagination
  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage);
  const paginatedEarnings = filteredEarnings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTypeColor = (type: string) => {
    const typeObj = earningsByType.find(et => et.type === type);
    return typeObj?.color || 'bg-gray-500';
  };

  const getTypeName = (type: string) => {
    const typeObj = earningsByType.find(et => et.type === type);
    return typeObj?.name || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'green', text: 'Completed' },
      pending: { color: 'yellow', text: 'Pending' },
      processing: { color: 'blue', text: 'Processing' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge color={config.color}>{config.text}</Badge>;
  };

  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'From User', 'Status'];
    const rows = filteredEarnings.map(e => [
      e.date,
      getTypeName(e.type),
      e.description,
      `$${e.amount.toFixed(2)}`,
      e.fromUser || 'N/A',
      e.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV report downloaded successfully!');
  };

  const handleExportPDF = () => {
    // Create a printable HTML document
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Earnings Report - ${new Date().toISOString().split('T')[0]}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e293b; margin-bottom: 10px; }
            .meta { color: #64748b; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f1f5f9; padding: 10px; text-align: left; border: 1px solid #cbd5e1; }
            td { padding: 10px; border: 1px solid #e2e8f0; }
            .amount { color: #10b981; font-weight: bold; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Earnings Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>From User</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEarnings.map(e => `
                <tr>
                  <td>${new Date(e.date).toLocaleDateString()}</td>
                  <td>${getTypeName(e.type)}</td>
                  <td>${e.description}</td>
                  <td class="amount">$${e.amount.toFixed(2)}</td>
                  <td>${e.fromUser || 'N/A'}</td>
                  <td>${e.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success('Opening print dialog...');
  };

  const handleWithdraw = () => {
    if (earningsOverview.availableWithdrawal <= 0) {
      toast.error('No funds available for withdrawal');
      return;
    }

    // Navigate to withdraw page
    navigate('/user/withdraw');
    toast.success('Redirecting to withdrawal page...');
  };

  return (
    <>
      <Helmet>
        <title>Earnings - Asterdex</title>
      </Helmet>

      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading earnings data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="bg-red-900/20 border-red-500 p-8 max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load Earnings</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </Card>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Celebratory Total Earnings Display */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-xl p-8 text-center shadow-2xl">
          <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">
            Total Earnings (All Time)
          </div>
          <div className="text-white text-6xl font-bold mb-2">
            ${earningsOverview.totalAllTime.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-white/90 text-lg">
            Congratulations on your success! 🎉
          </div>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <div className="space-y-2">
              <div className="text-gray-400 text-sm">This Month</div>
              <div className="text-3xl font-bold text-white">
                ${earningsOverview.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-green-400 text-sm">↑ 12.5% from last month</div>
            </div>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <div className="space-y-2">
              <div className="text-gray-400 text-sm">This Week</div>
              <div className="text-3xl font-bold text-white">
                ${earningsOverview.thisWeek.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-green-400 text-sm">↑ 8.2% from last week</div>
            </div>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <div className="space-y-2">
              <div className="text-gray-400 text-sm">Today</div>
              <div className="text-3xl font-bold text-white">
                ${earningsOverview.today.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-blue-400 text-sm">Great progress today!</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
            <div className="space-y-2">
              <div className="text-white/80 text-sm">Available for Withdrawal</div>
              <div className="text-3xl font-bold text-white">
                ${earningsOverview.availableWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <button
                className={`px-6 py-3 rounded-lg font-medium w-auto mt-2 transition-colors ${
                  earningsOverview.availableWithdrawal <= 0
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-white text-green-600 hover:bg-gray-50'
                }`}
                onClick={handleWithdraw}
                disabled={earningsOverview.availableWithdrawal <= 0}
              >
                {earningsOverview.availableWithdrawal > 0 ? 'Withdraw Now' : 'No Funds Available'}
              </button>
            </div>
          </Card>
        </div>

        {/* Earnings by Type */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Earnings by Type</h2>
            <p className="text-gray-400 text-sm mt-1">Breakdown of your income sources</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earningsByType.map(type => (
              <div key={type.type} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-3 h-3 rounded-full ${type.color} mt-1`}></div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Count</div>
                    <div className="text-white font-semibold">{type.count}</div>
                  </div>
                </div>
                <div className="text-white font-medium text-sm mb-2">{type.name}</div>
                <div className="text-2xl font-bold text-white mb-1">
                  ${type.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-gray-400 text-xs">
                  This month: <span className="text-white">${type.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Earnings Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Earnings Line Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">Daily Earnings (Last 30 Days)</h3>
              <p className="text-gray-400 text-sm">Track your daily income</p>
            </div>
            <div className="h-64 flex items-end justify-between gap-1">
              {dailyEarnings.map((day, index) => {
                const maxAmount = Math.max(...dailyEarnings.map(d => d.amount));
                const heightPercent = (day.amount / maxAmount) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t hover:from-cyan-400 hover:to-cyan-300 transition-all cursor-pointer"
                        style={{ height: `${heightPercent * 2}px` }}
                        title={`${day.date}: $${day.amount.toFixed(2)}`}
                      />
                    </div>
                    {index % 5 === 0 && (
                      <div className="text-gray-500 text-xs mt-1 transform -rotate-45 origin-top-left">
                        {day.date}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Monthly Earnings Bar Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">Monthly Earnings (Last 12 Months)</h3>
              <p className="text-gray-400 text-sm">View monthly trends</p>
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {monthlyEarnings.map((month, index) => {
                const maxAmount = Math.max(...monthlyEarnings.map(m => m.amount));
                const heightPercent = (month.amount / maxAmount) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t hover:from-purple-400 hover:to-purple-300 transition-all cursor-pointer"
                        style={{ height: `${heightPercent * 2}px` }}
                        title={`${month.month}: $${month.amount.toFixed(2)}`}
                      />
                    </div>
                    {index % 2 === 0 && (
                      <div className="text-gray-500 text-xs mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {month.month}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Earnings Distribution Pie Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">Earnings Distribution</h3>
            <p className="text-gray-400 text-sm">See where your income comes from</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Simple pie chart visualization */}
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 200 200" className="transform -rotate-90">
                {(() => {
                  const total = earningsDistribution.reduce((sum, item) => sum + item.value, 0);
                  let currentAngle = 0;
                  return earningsDistribution.map((item, index) => {
                    const percentage = (item.value / total) * 100;
                    const angle = (percentage / 100) * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (currentAngle * Math.PI) / 180;
                    const x1 = 100 + 80 * Math.cos(startRad);
                    const y1 = 100 + 80 * Math.sin(startRad);
                    const x2 = 100 + 80 * Math.cos(endRad);
                    const y2 = 100 + 80 * Math.sin(endRad);
                    const largeArc = angle > 180 ? 1 : 0;

                    const colorMap: Record<string, string> = {
                      'bg-green-500': '#22c55e',
                      'bg-blue-500': '#3b82f6',
                      'bg-purple-500': '#a855f7',
                      'bg-yellow-500': '#eab308',
                      'bg-red-500': '#ef4444',
                      'bg-indigo-500': '#6366f1'
                    };

                    return (
                      <path
                        key={index}
                        d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={colorMap[item.color] || '#6b7280'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        title={`${item.name}: $${item.value.toFixed(2)} (${percentage.toFixed(1)}%)`}
                      />
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {earningsDistribution.map((item, index) => {
                const total = earningsDistribution.reduce((sum, i) => sum + i.value, 0);
                const percentage = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="text-gray-300 text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-gray-400 text-xs">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Detailed Earnings Table */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Detailed Earnings</h2>
                <p className="text-gray-400 text-sm mt-1">Complete transaction history</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleExportCSV}>
                  Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportPDF}>
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search description or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">All Types</option>
                  <option value="direct">Direct Referral</option>
                  <option value="level">Level Income</option>
                  <option value="binary">Binary Bonus</option>
                  <option value="roi">ROI</option>
                  <option value="rank">Rank Rewards</option>
                  <option value="booster">Booster</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Min Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Amount</label>
                <input
                  type="number"
                  placeholder="10000.00"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterStatus('all');
                    setDateFrom('');
                    setDateTo('');
                    setAmountMin('');
                    setAmountMax('');
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Description</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">From User</th>
                  <th className="text-center py-3 px-4 text-gray-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEarnings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No earnings found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedEarnings.map(earning => (
                    <tr key={earning.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(earning.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getTypeColor(earning.type)}`}></div>
                          <span className="text-gray-300 text-sm">
                            {getTypeName(earning.type)}
                            {earning.level && ` (L${earning.level})`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{earning.description}</td>
                      <td className="py-3 px-4 text-right text-green-400 font-semibold">
                        +${earning.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {earning.fromUser || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(earning.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEarnings.length)} of {filteredEarnings.length} entries
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? 'primary' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && <span className="text-gray-400 px-2">...</span>}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Level Income Breakdown */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Level Income Breakdown</h2>
            <p className="text-gray-400 text-sm mt-1">Detailed commission structure across 30 levels</p>
          </div>

          <div className="space-y-2">
            {levelIncomeData.map(level => (
              <div key={level.level} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleLevel(level.level)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-900/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-cyan-400 font-semibold">Level {level.level}</div>
                    <div className="text-gray-400 text-sm">
                      {level.commissionPercent}% Commission
                    </div>
                    <div className="text-gray-400 text-sm">
                      {level.count} Members
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-white font-semibold">
                      ${level.totalEarned.toFixed(2)}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedLevels.has(level.level) ? 'rotate-180' : ''}`}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </button>

                {expandedLevels.has(level.level) && (
                  <div className="px-4 py-4 bg-gray-900/50 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Commission Rate</div>
                        <div className="text-white text-xl font-semibold">
                          {level.commissionPercent}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Active Members</div>
                        <div className="text-white text-xl font-semibold">
                          {level.count}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Total Earned</div>
                        <div className="text-green-400 text-xl font-semibold">
                          ${level.totalEarned.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-gray-400 text-sm">
                      Average per member: ${level.count > 0 ? (level.totalEarned / level.count).toFixed(2) : '0.00'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}
    </>
  );
};

export default EarningsNew;
