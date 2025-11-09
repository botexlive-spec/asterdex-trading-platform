import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getTransactionHistory } from '../../services/mlm-client';

interface Transaction {
  id: string;
  date: string;
  time: string;
  type: 'deposit' | 'withdraw' | 'commission' | 'roi' | 'transfer' | 'package' | 'bonus' | 'refund';
  description: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing';
  balanceBefore?: number;
  balanceAfter?: number;
  referenceId?: string;
  paymentMethod?: string;
  notes?: string;
}

interface StatusStep {
  label: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
}

const TransactionsNew: React.FC = () => {
  // State management
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const { user } = useAuth();

  // Load transaction history from API
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('📊 Loading transaction history for user:', user.id);

        // Fetch all transactions (limit 1000)
        const txData = await getTransactionHistory(1000, 0, user.id);
        console.log('✅ Loaded', txData.length, 'transactions');

        // Map API response to Transaction interface
        const mappedTransactions: Transaction[] = txData.map((tx: any) => {
          const createdAt = new Date(tx.createdAt);
          const type = mapTransactionType(tx.transactionType);

          return {
            id: tx.id,
            date: createdAt.toISOString().split('T')[0],
            time: createdAt.toTimeString().split(' ')[0],
            type,
            description: tx.description || getDefaultDescription(tx.transactionType),
            amount: tx.amount,
            status: tx.status || 'completed',
            referenceId: tx.referenceId,
          };
        });

        setAllTransactions(mappedTransactions);
        toast.success(`Loaded ${mappedTransactions.length} transactions`);
      } catch (error: any) {
        console.error('❌ Error loading transactions:', error);
        setError(error.message || 'Failed to load transactions');
        toast.error('Failed to load transaction history');
        setAllTransactions([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user?.id]);

  // Helper function to map transaction types from API to UI types
  const mapTransactionType = (apiType: string): Transaction['type'] => {
    const typeMap: Record<string, Transaction['type']> = {
      'level_income': 'commission',
      'matching_bonus': 'bonus',
      'booster_income': 'bonus',
      'rank_reward': 'bonus',
      'roi_distribution': 'roi',
      'package_purchase': 'package',
      'deposit': 'deposit',
      'withdrawal': 'withdraw',
      'transfer': 'transfer',
      'refund': 'refund',
    };
    return typeMap[apiType] || 'transfer';
  };

  // Helper function to get default description for transaction types
  const getDefaultDescription = (apiType: string): string => {
    const descriptions: Record<string, string> = {
      'level_income': 'Level Commission Earnings',
      'matching_bonus': 'Binary Matching Bonus',
      'booster_income': 'Booster Income Bonus',
      'rank_reward': 'Rank Achievement Reward',
      'roi_distribution': 'Daily ROI Earnings',
      'package_purchase': 'Package Purchase',
      'deposit': 'Account Deposit',
      'withdrawal': 'Withdrawal Request',
      'transfer': 'Transfer Transaction',
      'refund': 'Transaction Refund',
    };
    return descriptions[apiType] || 'Transaction';
  };

  // Transaction type configuration
  const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
    deposit: { label: 'Deposit', icon: '💰', color: 'green' },
    withdraw: { label: 'Withdraw', icon: '💸', color: 'red' },
    commission: { label: 'Commission', icon: '💵', color: 'blue' },
    roi: { label: 'ROI', icon: '📈', color: 'purple' },
    transfer: { label: 'Transfer', icon: '🔄', color: 'yellow' },
    package: { label: 'Package', icon: '📦', color: 'orange' },
    bonus: { label: 'Bonus', icon: '🎁', color: 'pink' },
    refund: { label: 'Refund', icon: '↩️', color: 'cyan' }
  };

  // Status configuration
  const statusConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' }> = {
    completed: { label: 'Completed', color: 'green' },
    pending: { label: 'Pending', color: 'yellow' },
    processing: { label: 'Processing', color: 'blue' },
    failed: { label: 'Failed', color: 'red' },
    cancelled: { label: 'Cancelled', color: 'gray' }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const completed = allTransactions.filter(t => t.status === 'completed');
    const deposits = completed.filter(t => t.type === 'deposit');
    const withdrawals = completed.filter(t => t.type === 'withdraw');
    const earnings = completed.filter(t => ['commission', 'roi', 'bonus'].includes(t.type));

    return {
      totalTransactions: allTransactions.length,
      totalDeposited: deposits.reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawn: Math.abs(withdrawals.reduce((sum, t) => sum + t.amount, 0)),
      totalEarned: earnings.reduce((sum, t) => sum + t.amount, 0)
    };
  }, [allTransactions]);

  // Quick date filters
  const applyQuickDateFilter = (filter: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        setDateFrom(formatDate(today));
        setDateTo(formatDate(today));
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        setDateFrom(formatDate(weekAgo));
        setDateTo(formatDate(today));
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        setDateFrom(formatDate(monthAgo));
        setDateTo(formatDate(today));
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        setDateFrom(formatDate(yearAgo));
        setDateTo(formatDate(today));
        break;
      default:
        setDateFrom('');
        setDateTo('');
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions.filter(transaction => {
      // Type filter
      if (filterType !== 'all' && transaction.type !== filterType) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && transaction.status !== filterStatus) {
        return false;
      }

      // Date range filter
      if (dateFrom && transaction.date < dateFrom) {
        return false;
      }
      if (dateTo && transaction.date > dateTo) {
        return false;
      }

      // Amount range filter
      const absAmount = Math.abs(transaction.amount);
      if (amountMin && absAmount < parseFloat(amountMin)) {
        return false;
      }
      if (amountMax && absAmount > parseFloat(amountMax)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          transaction.id.toLowerCase().includes(searchLower) ||
          transaction.description.toLowerCase().includes(searchLower) ||
          typeConfig[transaction.type].label.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case 'date':
          aVal = `${a.date} ${a.time}`;
          bVal = `${b.date} ${b.time}`;
          break;
        case 'type':
          aVal = typeConfig[a.type].label;
          bVal = typeConfig[b.type].label;
          break;
        case 'amount':
          aVal = Math.abs(a.amount);
          bVal = Math.abs(b.amount);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [allTransactions, filterType, filterStatus, dateFrom, dateTo, amountMin, amountMax, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Export functions
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Time', 'Type', 'Description', 'Amount', 'Status'];
    const rows = filteredAndSortedTransactions.map(t => [
      t.id,
      t.date,
      t.time,
      typeConfig[t.type].label,
      t.description,
      t.amount.toFixed(2),
      statusConfig[t.status].label
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    alert('Excel export would be implemented with a library like xlsx or exceljs');
  };

  const handleExportPDF = () => {
    alert('PDF export would be implemented with a library like jsPDF or pdfmake');
  };

  // Print receipt
  const handlePrintReceipt = (transaction: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Transaction Receipt - ${transaction.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
              h1 { text-align: center; color: #333; }
              .detail { margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee; }
              .label { font-weight: bold; display: inline-block; width: 150px; }
              .value { display: inline-block; }
              .amount { font-size: 24px; font-weight: bold; color: ${transaction.amount > 0 ? '#10b981' : '#ef4444'}; }
              .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Transaction Receipt</h1>
            <div class="detail"><span class="label">Transaction ID:</span><span class="value">${transaction.id}</span></div>
            <div class="detail"><span class="label">Date:</span><span class="value">${transaction.date} ${transaction.time}</span></div>
            <div class="detail"><span class="label">Type:</span><span class="value">${typeConfig[transaction.type].label}</span></div>
            <div class="detail"><span class="label">Description:</span><span class="value">${transaction.description}</span></div>
            <div class="detail"><span class="label">Amount:</span><span class="value amount">${transaction.amount > 0 ? '+' : ''}$${transaction.amount.toFixed(2)}</span></div>
            <div class="detail"><span class="label">Status:</span><span class="value">${statusConfig[transaction.status].label}</span></div>
            ${transaction.referenceId ? '<div class="detail"><span class="label">Reference ID:</span><span class="value">' + transaction.referenceId + '</span></div>' : ''}
            ${transaction.paymentMethod ? '<div class="detail"><span class="label">Payment Method:</span><span class="value">' + transaction.paymentMethod + '</span></div>' : ''}
            <div class="footer">Generated on ${new Date().toLocaleString()} | Asterdex Platform</div>
            <script>window.print(); window.onafterprint = function() { window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Get status timeline for transaction details
  const getStatusTimeline = (transaction: Transaction): StatusStep[] => {
    if (transaction.type === 'withdraw') {
      return [
        { label: 'Request Submitted', status: 'completed', date: `${transaction.date} ${transaction.time}` },
        {
          label: 'Processing',
          status: transaction.status === 'processing' || transaction.status === 'completed' ? 'completed' :
                  transaction.status === 'failed' ? 'current' : 'pending',
          date: transaction.status === 'completed' ? transaction.date : undefined
        },
        {
          label: transaction.status === 'failed' ? 'Failed' : 'Completed',
          status: transaction.status === 'completed' ? 'completed' :
                  transaction.status === 'failed' ? 'completed' : 'pending',
          date: transaction.status === 'completed' ? transaction.date : undefined
        }
      ];
    } else if (transaction.type === 'deposit') {
      return [
        { label: 'Payment Initiated', status: 'completed', date: `${transaction.date} ${transaction.time}` },
        { label: 'Verification', status: transaction.status === 'completed' ? 'completed' : 'current' },
        { label: 'Credited', status: transaction.status === 'completed' ? 'completed' : 'pending' }
      ];
    } else {
      return [
        { label: 'Transaction Created', status: 'completed', date: `${transaction.date} ${transaction.time}` },
        { label: 'Processed', status: transaction.status === 'completed' ? 'completed' : 'current' }
      ];
    }
  };

  return (
    <>
      <Helmet>
        <title>Transactions - Asterdex</title>
      </Helmet>

      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#00C7D1] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading transaction history...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="bg-red-900/20 border-red-700 max-w-md">
            <div className="text-center p-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">Failed to Load Transactions</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
                Retry
              </Button>
            </div>
          </Card>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
                <div className="text-3xl font-bold text-white">{summary.totalTransactions}</div>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-300 text-sm mb-1">Total Deposited</div>
                <div className="text-3xl font-bold text-white">${summary.totalDeposited.toLocaleString()}</div>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-red-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-300 text-sm mb-1">Total Withdrawn</div>
                <div className="text-3xl font-bold text-white">${summary.totalWithdrawn.toLocaleString()}</div>
              </div>
              <div className="text-4xl">💸</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-300 text-sm mb-1">Total Earned</div>
                <div className="text-3xl font-bold text-white">${summary.totalEarned.toLocaleString()}</div>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Filters</h2>
            <p className="text-gray-400 text-sm">Refine your transaction search</p>
          </div>

          {/* Search and Quick Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by ID, description, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportExcel}>
                Export Excel
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                Export PDF
              </Button>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdraw">Withdraw</option>
                <option value="commission">Commission</option>
                <option value="roi">ROI</option>
                <option value="transfer">Transfer</option>
                <option value="package">Package</option>
                <option value="bonus">Bonus</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Amount Min */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Min Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Amount Max */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Amount</label>
              <input
                type="number"
                placeholder="10000.00"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-gray-400 text-sm mr-2 self-center">Quick filters:</span>
            <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter('today')}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter('week')}>
              Last 7 Days
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter('month')}>
              Last 30 Days
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter('year')}>
              Last Year
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setDateFrom('');
                setDateTo('');
                setAmountMin('');
                setAmountMax('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
            >
              Clear All
            </Button>
          </div>

          <div className="text-sm text-gray-400">
            Showing {filteredAndSortedTransactions.length} of {allTransactions.length} transactions
          </div>
        </Card>

        {/* Transaction Table */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th
                    className="text-left py-3 px-4 text-gray-300 font-medium cursor-pointer hover:text-white"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      Transaction ID
                      {sortColumn === 'id' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-gray-300 font-medium cursor-pointer hover:text-white"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date & Time
                      {sortColumn === 'date' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-gray-300 font-medium cursor-pointer hover:text-white"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {sortColumn === 'type' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Description</th>
                  <th
                    className="text-right py-3 px-4 text-gray-300 font-medium cursor-pointer hover:text-white"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      {sortColumn === 'amount' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-center py-3 px-4 text-gray-300 font-medium cursor-pointer hover:text-white"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status
                      {sortColumn === 'status' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No transactions found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <td className="py-3 px-4">
                        <div className="text-cyan-400 font-mono text-sm hover:underline">
                          {transaction.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-300 text-sm">
                          {new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-gray-500 text-xs">{transaction.time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{typeConfig[transaction.type].icon}</span>
                          <span className="text-gray-300 text-sm">
                            {typeConfig[transaction.type].label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm max-w-xs truncate">
                        {transaction.description}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge color={statusConfig[transaction.status].color}>
                          {statusConfig[transaction.status].label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaction(transaction);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(transaction);
                            }}
                            className="text-gray-400 hover:text-gray-300 text-sm"
                          >
                            Print
                          </button>
                        </div>
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
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of{' '}
                {filteredAndSortedTransactions.length} entries
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
                {totalPages > 5 && (
                  <Button
                    size="sm"
                    variant={currentPage === totalPages ? 'primary' : 'outline'}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}
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

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTransaction(null)}
          >
            <div
              className="bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Transaction Details</h2>
                    <div className="text-cyan-400 font-mono text-sm">{selectedTransaction.id}</div>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Main Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Type</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeConfig[selectedTransaction.type].icon}</span>
                      <span className="text-white font-semibold">
                        {typeConfig[selectedTransaction.type].label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Status</div>
                    <Badge color={statusConfig[selectedTransaction.status].color} className="text-base">
                      {statusConfig[selectedTransaction.status].label}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Date & Time</div>
                    <div className="text-white">
                      {new Date(selectedTransaction.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-gray-400 text-sm">{selectedTransaction.time}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Amount</div>
                    <div
                      className={`text-3xl font-bold ${
                        selectedTransaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {selectedTransaction.amount > 0 ? '+' : ''}${selectedTransaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-gray-400 text-sm mb-1">Description</div>
                  <div className="text-white">{selectedTransaction.description}</div>
                </div>

                {/* Optional Fields */}
                {selectedTransaction.referenceId && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Reference ID</div>
                    <div className="text-white font-mono text-sm">{selectedTransaction.referenceId}</div>
                  </div>
                )}

                {selectedTransaction.paymentMethod && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Payment Method</div>
                    <div className="text-white">{selectedTransaction.paymentMethod}</div>
                  </div>
                )}

                {/* Balance Info */}
                {selectedTransaction.balanceBefore !== undefined && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Balance Before</div>
                        <div className="text-white font-semibold">
                          ${selectedTransaction.balanceBefore.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Change</div>
                        <div
                          className={`font-semibold ${
                            selectedTransaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {selectedTransaction.amount > 0 ? '+' : ''}${selectedTransaction.amount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Balance After</div>
                        <div className="text-white font-semibold">
                          ${selectedTransaction.balanceAfter?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Timeline */}
                <div>
                  <div className="text-white font-semibold mb-4">Status Timeline</div>
                  <div className="relative">
                    {getStatusTimeline(selectedTransaction).map((step, index) => (
                      <div key={index} className="flex gap-4 pb-6 last:pb-0">
                        <div className="relative">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              step.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : step.status === 'current'
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-gray-700 border-gray-600'
                            }`}
                          >
                            {step.status === 'completed' ? (
                              <span className="text-white text-sm">✓</span>
                            ) : step.status === 'current' ? (
                              <span className="text-white text-sm">•</span>
                            ) : (
                              <span className="text-gray-500 text-sm">•</span>
                            )}
                          </div>
                          {index < getStatusTimeline(selectedTransaction).length - 1 && (
                            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-10 bg-gray-700"></div>
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div
                            className={`font-medium ${
                              step.status === 'completed' || step.status === 'current'
                                ? 'text-white'
                                : 'text-gray-500'
                            }`}
                          >
                            {step.label}
                          </div>
                          {step.date && (
                            <div className="text-gray-400 text-sm">{step.date}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                    <div className="text-yellow-400 text-sm font-medium mb-1">Notes</div>
                    <div className="text-gray-300 text-sm">{selectedTransaction.notes}</div>
                  </div>
                )}

                {/* Support */}
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <div className="text-blue-400 text-sm font-medium mb-2">Need Help?</div>
                  <div className="text-gray-300 text-sm mb-3">
                    If you have questions about this transaction, please contact our support team.
                  </div>
                  <Button size="sm" variant="outline">
                    Contact Support
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handlePrintReceipt(selectedTransaction)}
                  >
                    Print Receipt
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setSelectedTransaction(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
};

export default TransactionsNew;
