// @ts-nocheck - TODO: Migrate Supabase calls to MySQL backend API
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

interface EarningType {
  type: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  label: string;
}

export const Earnings: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [earnings, setEarnings] = useState<EarningType[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      setLoading(true);

      // Get current user
      ;
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      // Get all earnings transactions (positive amounts only)
        // .from('mlm_transactions')
        // .select('transaction_type, amount, created_at, status')
        // .eq('user_id', user.id)
        // .gte('amount', 0) // Only positive transactions (earnings)
        // .in('transaction_type', [
          'roi_income',
          'direct_income',
          'level_income',
          'matching_bonus',
          'rank_reward',
          'booster_income',
          'pool_share',
          'robot_subscription'
        ]);

      if (txError) throw txError;

      // Calculate earnings by type
      const earningsByType: Record<string, number> = {
        roi_income: 0,
        direct_income: 0,
        level_income: 0,
        matching_bonus: 0,
        rank_reward: 0,
        booster_income: 0,
        pool_share: 0,
        robot_subscription: 0
      };

      let totalEarnings = 0;
      let todayEarnings = 0;
      let monthEarnings = 0;
      let pendingEarnings = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      transactions?.forEach(tx => {
        const amount = parseFloat(tx.amount.toString());
        totalEarnings += amount;
        earningsByType[tx.transaction_type] = (earningsByType[tx.transaction_type] || 0) + amount;

        const txDate = new Date(tx.created_at);
        if (txDate >= today) {
          todayEarnings += amount;
        }
        if (txDate >= monthStart) {
          monthEarnings += amount;
        }
        if (tx.status === 'pending') {
          pendingEarnings += amount;
        }
      });

      setStats({
        total: totalEarnings,
        today: todayEarnings,
        thisMonth: monthEarnings,
        pending: pendingEarnings
      });

      // Create earnings array with percentages
      const earningsArray: EarningType[] = [
        {
          type: 'roi_income',
          label: 'ROI Earnings',
          amount: earningsByType.roi_income,
          percentage: totalEarnings > 0 ? (earningsByType.roi_income / totalEarnings) * 100 : 0,
          color: '#2196f3',
          icon: '📈'
        },
        {
          type: 'direct_income',
          label: 'Direct Referral',
          amount: earningsByType.direct_income,
          percentage: totalEarnings > 0 ? (earningsByType.direct_income / totalEarnings) * 100 : 0,
          color: '#4caf50',
          icon: '👤'
        },
        {
          type: 'level_income',
          label: 'Level Commission',
          amount: earningsByType.level_income,
          percentage: totalEarnings > 0 ? (earningsByType.level_income / totalEarnings) * 100 : 0,
          color: '#ff9800',
          icon: '🤝'
        },
        {
          type: 'matching_bonus',
          label: 'Binary Income',
          amount: earningsByType.matching_bonus,
          percentage: totalEarnings > 0 ? (earningsByType.matching_bonus / totalEarnings) * 100 : 0,
          color: '#9c27b0',
          icon: '⚖️'
        },
        {
          type: 'rank_reward',
          label: 'Rank Bonus',
          amount: earningsByType.rank_reward,
          percentage: totalEarnings > 0 ? (earningsByType.rank_reward / totalEarnings) * 100 : 0,
          color: '#ffc107',
          icon: '🏅'
        },
        {
          type: 'booster_income',
          label: 'Booster Income',
          amount: earningsByType.booster_income,
          percentage: totalEarnings > 0 ? (earningsByType.booster_income / totalEarnings) * 100 : 0,
          color: '#00bcd4',
          icon: '🚀'
        },
        {
          type: 'pool_share',
          label: 'Pool Share',
          amount: earningsByType.pool_share,
          percentage: totalEarnings > 0 ? (earningsByType.pool_share / totalEarnings) * 100 : 0,
          color: '#e91e63',
          icon: '🏊'
        },
        {
          type: 'robot_subscription',
          label: 'Robot Earnings',
          amount: earningsByType.robot_subscription,
          percentage: totalEarnings > 0 ? (earningsByType.robot_subscription / totalEarnings) * 100 : 0,
          color: '#3f51b5',
          icon: '🤖'
        }
      ];

      setEarnings(earningsArray);

    } catch (error: any) {
      console.error('Error loading earnings:', error);
      toast.error(error.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>💰</div>
        <p>Loading earnings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        ← Back to Dashboard
      </button>

      <h1>Earnings Overview</h1>
      <p>Detailed breakdown of all your earnings</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div style={{ padding: '25px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
          <p style={{ opacity: 0.9, marginBottom: '10px' }}>Total Earnings</p>
          <h2 style={{ fontSize: '36px', margin: '0' }}>${stats.total.toFixed(2)}</h2>
          <p style={{ opacity: 0.8, fontSize: '14px', marginTop: '10px' }}>All time</p>
        </div>

        <div style={{ padding: '25px', background: '#fff', borderRadius: '12px', border: '1px solid #ddd' }}>
          <p style={{ color: '#666', marginBottom: '10px' }}>Today's Earnings</p>
          <h3 style={{ fontSize: '28px', margin: '0', color: '#4caf50' }}>${stats.today.toFixed(2)}</h3>
          <p style={{ color: stats.today > 0 ? '#4caf50' : '#666', fontSize: '14px', marginTop: '10px' }}>
            {stats.today > 0 ? '+' : ''}
            {stats.total > 0 ? ((stats.today / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div style={{ padding: '25px', background: '#fff', borderRadius: '12px', border: '1px solid #ddd' }}>
          <p style={{ color: '#666', marginBottom: '10px' }}>This Month</p>
          <h3 style={{ fontSize: '28px', margin: '0', color: '#2196f3' }}>${stats.thisMonth.toFixed(2)}</h3>
          <p style={{ color: stats.thisMonth > 0 ? '#4caf50' : '#666', fontSize: '14px', marginTop: '10px' }}>
            {stats.thisMonth > 0 ? '+' : ''}
            {stats.total > 0 ? ((stats.thisMonth / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div style={{ padding: '25px', background: '#fff', borderRadius: '12px', border: '1px solid #ddd' }}>
          <p style={{ color: '#666', marginBottom: '10px' }}>Pending</p>
          <h3 style={{ fontSize: '28px', margin: '0', color: '#ff9800' }}>${stats.pending.toFixed(2)}</h3>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>Awaiting release</p>
        </div>
      </div>

      <div style={{ marginTop: '30px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', padding: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Earnings by Type</h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          {earnings.map((earning, index) => (
            <div
              key={index}
              style={{
                padding: '20px',
                background: '#f5f5f5',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '60px 1fr 150px 150px',
                alignItems: 'center',
                gap: '20px'
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: earning.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {earning.icon}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: '#333', marginBottom: '5px' }}>
                  {earning.label}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {earning.percentage.toFixed(1)}% of total
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: earning.amount > 0 ? earning.color : '#999'
                }}>
                  ${earning.amount.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${earning.percentage}%`,
                    height: '100%',
                    background: earning.color,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>💡 Maximize Your Earnings</h4>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
          <li><strong>ROI Earnings:</strong> Daily returns from your active investment packages</li>
          <li><strong>Direct Referral:</strong> Instant commission when your direct referrals invest</li>
          <li><strong>Level Commission:</strong> Earn from up to 30 levels of downline (rank-dependent)</li>
          <li><strong>Binary Income:</strong> Matching bonus from balanced binary team volume</li>
          <li><strong>Rank Bonus:</strong> One-time rewards when achieving new ranks</li>
          <li><strong>Booster Income:</strong> Extra earnings from tier-matching in your downline</li>
          <li><strong>View Transactions:</strong> See detailed history in the <button onClick={() => navigate('/transactions')} style={{ color: '#667eea', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>Transactions</button> page</li>
        </ul>
      </div>
    </div>
  );
};

export default Earnings;
