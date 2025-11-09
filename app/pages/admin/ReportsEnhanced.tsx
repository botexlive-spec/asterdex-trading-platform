/**
 * Enhanced Reports Page
 * Paginated reports for ROI, Level Income, Binary, Boosters, Withdrawals
 * Includes CSV export functionality
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type ReportType = 'roi' | 'level-income' | 'binary' | 'boosters' | 'withdrawals';

interface ReportFilter {
  reportType: ReportType;
  page: number;
  limit: number;
  startDate: string;
  endDate: string;
  userId?: string;
  status?: string;
  level?: string;
}

export default function ReportsEnhanced() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilter>({
    reportType: 'roi',
    page: 1,
    limit: 50,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (token) {
      fetchReport();
    }
  }, [token, filters.reportType, filters.page]);

  const fetchReport = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.status) params.append('status', filters.status);
      if (filters.level) params.append('level', filters.level);

      const res = await api.get(`/reports-enhanced/${filters.reportType}?${params.toString()}`, token);

      if (res.data?.success) {
        setReportData(res.data);
      }
    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reports-enhanced/export/${filters.reportType}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filters.reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report exported successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const handleApplyFilters = () => {
    setFilters({ ...filters, page: 1 });
    fetchReport();
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const renderSummary = () => {
    if (!reportData?.summary) return null;

    switch (filters.reportType) {
      case 'roi':
      case 'binary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-sm text-text-secondary">Total Payouts</div>
              <div className="text-2xl font-bold text-white">{reportData.summary.total_payouts || 0}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-secondary">Total Amount</div>
              <div className="text-2xl font-bold text-green-400">
                ${(reportData.summary.total_amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-secondary">Average Amount</div>
              <div className="text-2xl font-bold text-theme">
                ${(reportData.summary.avg_amount || 0).toFixed(2)}
              </div>
            </div>
          </div>
        );

      case 'level-income':
        return (
          <div className="card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Summary by Level</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {reportData.summary.by_level?.slice(0, 10).map((level: any) => (
                <div key={level.level} className="bg-surface-light p-3 rounded-lg">
                  <div className="text-xs text-text-secondary">Level {level.level}</div>
                  <div className="text-lg font-bold text-white">{level.count}</div>
                  <div className="text-xs text-green-400">${level.total_amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'boosters':
        return (
          <div className="card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Summary by Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportData.summary.by_status?.map((status: any) => (
                <div key={status.status} className="bg-surface-light p-4 rounded-lg">
                  <div className="text-sm text-text-secondary capitalize">{status.status}</div>
                  <div className="text-2xl font-bold text-white">{status.count}</div>
                  <div className="text-xs text-theme">Avg: {status.avg_directs.toFixed(1)} directs</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'withdrawals':
        return (
          <div className="card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Summary by Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {reportData.summary.by_status?.map((status: any) => (
                <div key={status.status} className="bg-surface-light p-4 rounded-lg">
                  <div className="text-sm text-text-secondary capitalize">{status.status}</div>
                  <div className="text-xl font-bold text-white">{status.count}</div>
                  <div className="text-xs text-green-400">Amount: ${status.total_amount.toLocaleString()}</div>
                  <div className="text-xs text-yellow-400">Fees: ${status.total_fees.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderTable = () => {
    if (!reportData?.data || reportData.data.length === 0) {
      return (
        <div className="card p-8 text-center">
          <div className="text-text-secondary">No data found for the selected filters</div>
        </div>
      );
    }

    const columns = getColumnsForReportType(filters.reportType);

    return (
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-light border-b border-surface-lighter">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.data.map((row: any, idx: number) => (
              <tr key={row.id || idx} className="border-b border-surface-lighter hover:bg-surface-light">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-white">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getColumnsForReportType = (type: ReportType) => {
    switch (type) {
      case 'roi':
        return [
          { key: 'email', label: 'Email' },
          { key: 'full_name', label: 'Name' },
          { key: 'amount', label: 'Amount', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'status', label: 'Status', render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs ${
              val === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {val}
            </span>
          )},
          { key: 'created_at', label: 'Date', render: (val: string) => new Date(val).toLocaleString() },
        ];

      case 'level-income':
        return [
          { key: 'user_email', label: 'User Email' },
          { key: 'from_user_email', label: 'From User' },
          { key: 'level', label: 'Level' },
          { key: 'amount', label: 'Amount', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'status', label: 'Status', render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs ${
              val === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {val}
            </span>
          )},
          { key: 'created_at', label: 'Date', render: (val: string) => new Date(val).toLocaleString() },
        ];

      case 'binary':
        return [
          { key: 'email', label: 'Email' },
          { key: 'full_name', label: 'Name' },
          { key: 'left_volume', label: 'Left Volume', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'right_volume', label: 'Right Volume', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'amount', label: 'Bonus', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'created_at', label: 'Date', render: (val: string) => new Date(val).toLocaleString() },
        ];

      case 'boosters':
        return [
          { key: 'email', label: 'Email' },
          { key: 'direct_count', label: 'Directs' },
          { key: 'target_directs', label: 'Target' },
          { key: 'bonus_roi_percentage', label: 'Bonus %' },
          { key: 'status', label: 'Status', render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs ${
              val === 'achieved' ? 'bg-green-500/20 text-green-400' :
              val === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {val}
            </span>
          )},
          { key: 'start_date', label: 'Start', render: (val: string) => new Date(val).toLocaleDateString() },
          { key: 'end_date', label: 'End', render: (val: string) => new Date(val).toLocaleDateString() },
        ];

      case 'withdrawals':
        return [
          { key: 'email', label: 'Email' },
          { key: 'amount', label: 'Amount', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'fee', label: 'Fee', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'net_amount', label: 'Net', render: (val: number) => `$${val.toLocaleString()}` },
          { key: 'wallet_address', label: 'Wallet', render: (val: string) => val ? `${val.substring(0, 10)}...` : '-' },
          { key: 'status', label: 'Status', render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs ${
              val === 'completed' ? 'bg-green-500/20 text-green-400' :
              val === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {val}
            </span>
          )},
          { key: 'created_at', label: 'Date', render: (val: string) => new Date(val).toLocaleString() },
        ];

      default:
        return [];
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Enhanced Reports</h1>
        <p className="text-text-secondary">
          Paginated reports with CSV export for ROI, Level Income, Binary, Boosters, and Withdrawals
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { value: 'roi', label: 'ROI Payouts', icon: '💰' },
            { value: 'level-income', label: 'Level Income', icon: '📊' },
            { value: 'binary', label: 'Binary Matching', icon: '🌳' },
            { value: 'boosters', label: 'Boosters', icon: '🚀' },
            { value: 'withdrawals', label: 'Withdrawals', icon: '💸' },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setFilters({ ...filters, reportType: type.value as ReportType, page: 1 })}
              className={`p-4 rounded-lg transition-all ${
                filters.reportType === type.value
                  ? 'bg-theme text-white'
                  : 'bg-surface-light text-text-secondary hover:bg-surface-lighter'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-semibold">{type.label}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 bg-surface-light border border-surface-lighter rounded-lg text-white focus:outline-none focus:border-theme"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 bg-surface-light border border-surface-lighter rounded-lg text-white focus:outline-none focus:border-theme"
            />
          </div>

          {(filters.reportType === 'roi' || filters.reportType === 'level-income') && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">User ID (optional)</label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-4 py-2 bg-surface-light border border-surface-lighter rounded-lg text-white focus:outline-none focus:border-theme"
                placeholder="Filter by user ID"
              />
            </div>
          )}

          {filters.reportType === 'level-income' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Level (optional)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={filters.level || ''}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="w-full px-4 py-2 bg-surface-light border border-surface-lighter rounded-lg text-white focus:outline-none focus:border-theme"
                placeholder="1-30"
              />
            </div>
          )}

          {(filters.reportType === 'boosters' || filters.reportType === 'withdrawals') && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 bg-surface-light border border-surface-lighter rounded-lg text-white focus:outline-none focus:border-theme"
              >
                <option value="">All Statuses</option>
                {filters.reportType === 'boosters' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="achieved">Achieved</option>
                    <option value="expired">Expired</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="px-6 py-2 bg-theme text-white rounded-lg hover:bg-theme/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || !reportData}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      {reportData && (
        <div className="mb-6">
          {renderSummary()}
        </div>
      )}

      {/* Table */}
      {renderTable()}

      {/* Pagination */}
      {reportData?.pagination && reportData.pagination.totalPages > 1 && (
        <div className="card p-4 mt-6 flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            Page {reportData.pagination.page} of {reportData.pagination.totalPages} ({reportData.pagination.total} total records)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(reportData.pagination.page - 1)}
              disabled={reportData.pagination.page === 1}
              className="px-4 py-2 bg-surface-light text-white rounded-lg hover:bg-surface-lighter transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(reportData.pagination.page + 1)}
              disabled={reportData.pagination.page >= reportData.pagination.totalPages}
              className="px-4 py-2 bg-surface-light text-white rounded-lg hover:bg-surface-lighter transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
