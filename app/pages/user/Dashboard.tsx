/**
 * User Dashboard - Main Overview Page
 * Displays user stats, earnings, team info, and quick actions
 */

import React, { useEffect, useState } from 'react';
import { getUserDashboard, hasActiveRobotSubscription } from '../../services/mlm-client';
import { getTeamStats } from '../../services/team.service';
import { UserDashboardData } from '../../types/mlm.types';
import DEXTerminal from '../../components/dex/DEXTerminal';

export const UserDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDEX, setShowDEX] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Load dashboard data and real-time team stats in parallel
      const [data, stats] = await Promise.all([
        getUserDashboard(),
        getTeamStats()
      ]);
      setDashboardData(data);
      setTeamStats(stats);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-error">
        <p>{error || 'Failed to load dashboard'}</p>
        <button onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  const { user, statistics, recent_transactions, active_packages, direct_referrals, notifications, next_rank } = dashboardData;

  return (
    <div className="user-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user.full_name || user.email}!</h1>
          <p className="user-rank">
            Current Rank: <span className="rank-badge">{user.current_rank.replace('_', ' ').toUpperCase()}</span>
          </p>
        </div>

        <div className="quick-actions">
          <button className="btn-primary" onClick={() => window.location.href = '/packages'}>
            💰 Invest in Package
          </button>
          <button className="btn-secondary" onClick={() => setShowDEX(true)}>
            📈 Trade on DEX
          </button>
          {!user.robot_subscription_active && (
            <button className="btn-warning" onClick={() => window.location.href = '/robot'}>
              ⚠️ Activate Robot
            </button>
          )}
        </div>
      </div>

      {/* Robot Subscription Alert */}
      {!user.robot_subscription_active && (
        <div className="alert alert-warning">
          <h3>⚠️ Robot Subscription Required</h3>
          <p>
            You need an active robot subscription ($100) to unlock MLM earnings and purchase packages.
          </p>
          <button onClick={() => window.location.href = '/robot'}>
            Activate Now
          </button>
        </div>
      )}

      {/* KYC Alert */}
      {user.kyc_status !== 'approved' && (
        <div className="alert alert-info">
          <h3>📄 Complete KYC Verification</h3>
          <p>
            Status: <strong>{user.kyc_status.replace('_', ' ').toUpperCase()}</strong>
            {user.kyc_status === 'not_submitted' && ' - Complete KYC to unlock withdrawals'}
          </p>
          {user.kyc_status === 'not_submitted' && (
            <button onClick={() => window.location.href = '/kyc'}>
              Submit KYC Documents
            </button>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card balance">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <p className="stat-label">Wallet Balance</p>
            <h2 className="stat-value">${user.wallet_balance.toFixed(2)}</h2>
            <div className="stat-actions">
              <button onClick={() => window.location.href = '/wallet/deposit'}>Deposit</button>
              <button onClick={() => window.location.href = '/wallet/withdraw'}>Withdraw</button>
            </div>
          </div>
        </div>

        <div className="stat-card investment">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <p className="stat-label">Total Investment</p>
            <h2 className="stat-value">${user.total_investment.toFixed(2)}</h2>
            <p className="stat-sub">ROI: ${statistics.roi_earned.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card earnings">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <p className="stat-label">Total Earnings</p>
            <h2 className="stat-value">${user.total_earnings.toFixed(2)}</h2>
            <div className="earnings-breakdown">
              <span>Today: ${statistics.today_earnings.toFixed(2)}</span>
              <span>Week: ${statistics.week_earnings.toFixed(2)}</span>
              <span>Month: ${statistics.month_earnings.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="stat-card team">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <p className="stat-label">Team</p>
            <h2 className="stat-value">{teamStats?.totalTeamSize || 0}</h2>
            <p className="stat-sub">Directs: {teamStats?.directCount || 0} | Levels: {teamStats?.levelsUnlocked || 0}/30</p>
          </div>
        </div>

        <div className="stat-card volume">
          <div className="stat-icon">⚖️</div>
          <div className="stat-content">
            <p className="stat-label">Team Volume</p>
            <h2 className="stat-value">${(teamStats?.totalVolume || 0).toFixed(2)}</h2>
            <div className="volume-bars">
              <div className="volume-bar left">
                <span>Left</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${statistics.total_volume > 0 ? (statistics.left_volume / statistics.total_volume) * 100 : 50}%` }}></div>
                </div>
                <span>${statistics.left_volume.toFixed(2)}</span>
              </div>
              <div className="volume-bar right">
                <span>Right</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${statistics.total_volume > 0 ? (statistics.right_volume / statistics.total_volume) * 100 : 50}%` }}></div>
                </div>
                <span>${statistics.right_volume.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card rank">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <p className="stat-label">Next Rank</p>
            <h3 className="rank-name">{next_rank.rank.replace('_', ' ').toUpperCase()}</h3>
            <div className="rank-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(statistics.total_volume / next_rank.min_volume) * 100}%`
                  }}
                ></div>
              </div>
              <p className="progress-text">
                ${statistics.total_volume.toFixed(2)} / ${next_rank.min_volume.toFixed(2)}
              </p>
            </div>
            <p className="reward-text">Reward: ${next_rank.reward_amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Active Packages */}
      <div className="section-container">
        <div className="section-header">
          <h2>📦 Active Packages</h2>
          <button onClick={() => window.location.href = '/packages'}>View All</button>
        </div>
        <div className="packages-grid">
          {active_packages.length > 0 ? (
            active_packages.slice(0, 3).map((pkg) => (
              <div key={pkg.id} className="package-card">
                <h3>${pkg.amount.toFixed(2)}</h3>
                <p className="package-roi">ROI: {pkg.roi_percentage}%</p>
                <p className="package-earned">Earned: ${pkg.roi_earned.toFixed(2)}</p>
                <p className="package-date">
                  Since: {new Date(pkg.purchased_at).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No active packages</p>
              <button onClick={() => window.location.href = '/packages'}>
                Purchase Package
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Direct Referrals */}
      <div className="section-container">
        <div className="section-header">
          <h2>👥 Direct Referrals ({user.direct_count})</h2>
          <button onClick={() => window.location.href = '/team'}>View Team</button>
        </div>
        <div className="referrals-list">
          {direct_referrals.length > 0 ? (
            direct_referrals.slice(0, 5).map((referral) => (
              <div key={referral.id} className="referral-item">
                <div className="referral-info">
                  <p className="referral-name">{referral.full_name || referral.email}</p>
                  <p className="referral-investment">Investment: ${referral.total_investment.toFixed(2)}</p>
                </div>
                <p className="referral-date">
                  {new Date(referral.joined_at).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No direct referrals yet</p>
              <button onClick={() => window.location.href = '/referrals'}>
                Get Referral Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="section-container">
        <div className="section-header">
          <h2>💳 Recent Transactions</h2>
          <button onClick={() => window.location.href = '/transactions'}>View All</button>
        </div>
        <div className="transactions-list">
          {recent_transactions.length > 0 ? (
            recent_transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className="tx-icon">{getTransactionIcon(tx.transaction_type)}</div>
                <div className="tx-info">
                  <p className="tx-type">{tx.transaction_type.replace('_', ' ').toUpperCase()}</p>
                  <p className="tx-date">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="tx-amount">
                  <span className={tx.transaction_type.includes('income') || tx.transaction_type.includes('bonus') ? 'positive' : ''}>
                    {tx.transaction_type.includes('income') || tx.transaction_type.includes('bonus') ? '+' : ''}
                    ${tx.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="section-container notifications">
          <div className="section-header">
            <h2>🔔 Notifications</h2>
            <button onClick={() => window.location.href = '/notifications'}>View All</button>
          </div>
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div key={notif.id} className="notification-item">
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
                <span className="notif-time">{new Date(notif.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEX Terminal Modal */}
      {showDEX && (
        <div className="modal-overlay" onClick={() => setShowDEX(false)}>
          <div className="modal-content dex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📈 DEX Trading Terminal</h2>
              <button onClick={() => setShowDEX(false)}>✕</button>
            </div>
            <DEXTerminal fullscreen={false} />
          </div>
        </div>
      )}

      <style jsx>{`
        .user-dashboard {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .welcome-section h1 {
          margin: 0 0 10px 0;
          color: var(--text-primary, #ffffff);
        }

        .rank-badge {
          background: var(--primary-color, #b084e9);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 14px;
        }

        .quick-actions {
          display: flex;
          gap: 10px;
        }

        .quick-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--primary-color, #b084e9);
          color: white;
        }

        .btn-secondary {
          background: var(--secondary-color, #4a9eff);
          color: white;
        }

        .btn-warning {
          background: #ff9500;
          color: white;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .alert {
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .alert-warning {
          background: rgba(255, 149, 0, 0.1);
          border-left: 4px solid #ff9500;
        }

        .alert-info {
          background: rgba(74, 158, 255, 0.1);
          border-left: 4px solid #4a9eff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: var(--bg-secondary, #1a1a1a);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color, #333);
        }

        .stat-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }

        .stat-label {
          color: var(--text-secondary, #999);
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-value {
          color: var(--text-primary, #ffffff);
          font-size: 28px;
          margin: 0;
        }

        .section-container {
          background: var(--bg-secondary, #1a1a1a);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid var(--border-color, #333);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }

        .package-card {
          background: var(--bg-tertiary, #2a2a2a);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary, #999);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content.dex-modal {
          width: 95%;
          max-width: 1400px;
          height: 90vh;
          background: var(--bg-primary, #0a0a0a);
          border-radius: 12px;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #333);
        }
      `}</style>
    </div>
  );
};

function getTransactionIcon(type: string): string {
  const icons: Record<string, string> = {
    robot_subscription: '🤖',
    package_investment: '📦',
    direct_income: '💰',
    level_income: '📊',
    booster_income: '🚀',
    matching_bonus: '🎯',
    roi_income: '💵',
    rank_reward: '🏆',
    withdrawal: '💸',
    deposit: '💳',
    dex_trade: '📈',
  };

  return icons[type] || '💳';
}

export default UserDashboard;
