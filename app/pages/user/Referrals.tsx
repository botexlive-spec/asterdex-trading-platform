import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

export const Referrals: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referralStats, setReferralStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    total_earnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Get current user
      ;
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      // Get user's referral code
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referral_code, id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const code = userData.referral_code || userData.id.substring(0, 8).toUpperCase();
      setReferralCode(code);

      // Construct referral link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/register?ref=${code}`;
      setReferralLink(link);

      // Get referral statistics
      const { count: totalReferrals } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', user.id);

      const { count: activeReferrals } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', user.id)
        .eq('is_active', true);

      const { count: pendingReferrals } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', user.id)
        .eq('kyc_status', 'not_submitted');

      // Calculate total earnings from referrals (direct income + level commissions)
      const { data: earnings } = await supabase
        .from('mlm_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .in('transaction_type', ['direct_income', 'level_income']);

      const totalEarnings = earnings?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

      setReferralStats({
        total: totalReferrals || 0,
        active: activeReferrals || 0,
        pending: pendingReferrals || 0,
        total_earnings: totalEarnings
      });

    } catch (error: any) {
      console.error('Error loading referral data:', error);
      toast.error(error.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Join Finaster MLM Platform and start earning! Use my referral code: ${referralCode}\n\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = `Join Finaster MLM Platform! Use my referral code: ${referralCode}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = `Join Finaster MLM Platform! Use my referral code: ${referralCode}\n${referralLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔗</div>
        <p>Loading referral data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        ← Back to Dashboard
      </button>

      <h1>Referral Program</h1>
      <p>Invite friends and earn commissions</p>

      {/* Referral Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minWidth(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>👥</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#667eea' }}>{referralStats.total}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Total Referrals</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>✅</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#4caf50' }}>{referralStats.active}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Active Referrals</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>⏳</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#ff9800' }}>{referralStats.pending}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Pending KYC</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>💰</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#2196f3' }}>${referralStats.total_earnings.toFixed(2)}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Total Earnings</p>
        </div>
      </div>

      {/* Referral Link Section */}
      <div style={{ marginTop: '30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '30px', color: 'white' }}>
        <h2 style={{ margin: '0 0 20px 0' }}>Your Referral Link</h2>

        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
          <p style={{ fontFamily: 'monospace', wordBreak: 'break-all', margin: '0', fontSize: '14px' }}>
            {referralLink}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => copyToClipboard(referralLink)}
            style={{
              padding: '12px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
          <button
            onClick={shareViaWhatsApp}
            style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.3)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📱 WhatsApp
          </button>
        </div>
      </div>

      {/* Referral Code Section */}
      <div style={{ marginTop: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', padding: '30px' }}>
        <h3>Your Referral Code</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
          <div style={{ flex: 1, padding: '15px', background: '#f5f5f5', borderRadius: '6px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'monospace' }}>
            {referralCode}
          </div>
          <button
            onClick={() => copyToClipboard(referralCode)}
            style={{
              padding: '15px 30px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Social Sharing */}
      <div style={{ marginTop: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', padding: '30px' }}>
        <h3>Share on Social Media</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <button
            onClick={shareViaWhatsApp}
            style={{
              padding: '15px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            📱 WhatsApp
          </button>
          <button
            onClick={shareViaFacebook}
            style={{
              padding: '15px',
              background: '#1877F2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            📘 Facebook
          </button>
          <button
            onClick={shareViaTwitter}
            style={{
              padding: '15px',
              background: '#1DA1F2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            🐦 Twitter
          </button>
          <button
            onClick={shareViaTelegram}
            style={{
              padding: '15px',
              background: '#0088CC',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            ✈️ Telegram
          </button>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>💡 Referral Earnings</h4>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
          <li><strong>Direct Commission:</strong> Earn instant commission when your referral purchases a package</li>
          <li><strong>Level Commissions:</strong> Earn from 30 levels of downline (depth depends on your rank)</li>
          <li><strong>Binary Matching:</strong> Earn from binary team volume matching bonus</li>
          <li><strong>Rank Bonuses:</strong> Achieve ranks based on team performance for additional rewards</li>
          <li><strong>Booster Income:</strong> Earn extra commissions based on package tier matching</li>
        </ul>
      </div>

      {/* View Team Button */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/team')}
          style={{
            padding: '15px 40px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '16px'
          }}
        >
          👥 View My Team
        </button>
      </div>
    </div>
  );
};

export default Referrals;
