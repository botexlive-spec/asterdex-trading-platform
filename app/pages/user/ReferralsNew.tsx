import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getDirectReferrals } from '../../services/team.service';

const ReferralsNew: React.FC = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'earnings'>('date');
  const [showQRModal, setShowQRModal] = useState(false);

  // Fetch referrals on mount and when user changes
  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user?.id) {
        console.log('⚠️ [Referrals] No user ID available');
        return;
      }

      console.log('👥 [Referrals] Fetching direct referrals for user:', user.email);
      setLoading(true);
      setError(null);

      try {
        // Add 10-second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        // Get direct referrals from MySQL API (JWT-based)
        const refs = await Promise.race([
          getDirectReferrals(),
          timeoutPromise
        ]) as any[];

        console.log('📊 [Referrals] Received:', refs.length, 'direct referrals');

        // Transform data to match existing interface
        const transformedRefs = refs.map((ref: any) => ({
          id: ref.id,
          name: ref.full_name || 'Unknown User',
          email: ref.email || '',
          joinDate: ref.created_at || new Date().toISOString(),
          status: ref.is_active ? 'active' : 'inactive',
          investment: parseFloat(ref.total_investment) || 0,
          earnings: parseFloat(ref.commission_earnings) || 0,
          level: 1, // Direct referrals are level 1
        }));

        setReferrals(transformedRefs);
        console.log('✅ [Referrals] Referrals loaded:', transformedRefs.length);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load referrals';
        setError(errorMessage);
        console.error('❌ [Referrals] Error fetching referrals:', errorMessage);
        toast.error(errorMessage);
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, [user?.id]);

  // Generate dynamic referral data based on logged-in user
  const referralCode = user?.id || 'USER_ID';
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const shortLink = `${window.location.host}/r/${referralCode.substring(0, 6)}`;

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(r => r.status === 'active').length;
    const totalEarnings = referrals.reduce((sum, r) => sum + r.earnings, 0);
    const thisMonthReferrals = referrals.filter(r => {
      const joinDate = new Date(r.joinDate);
      return joinDate.getMonth() === thisMonth && joinDate.getFullYear() === thisYear;
    }).length;

    return {
      totalReferrals,
      activeReferrals,
      totalEarnings,
      thisMonthReferrals,
    };
  }, [referrals]);

  // Filter and sort referrals
  const filteredReferrals = useMemo(() => {
    let filtered = referrals;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      } else {
        return b.earnings - a.earnings;
      }
    });

    return filtered;
  }, [referrals, searchTerm, statusFilter, sortBy]);

  // Calculate monthly performance data from real referrals
  const performanceData = useMemo(() => {
    // Get last 6 months
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();

      // Filter referrals for this month
      const monthReferrals = referrals.filter(r => {
        const joinDate = new Date(r.joinDate);
        return joinDate.getFullYear() === year && joinDate.getMonth() === month;
      });

      months.push({
        month: monthName,
        referrals: monthReferrals.length,
        earnings: monthReferrals.reduce((sum, r) => sum + (r.earnings || 0), 0)
      });
    }

    console.log('📊 Performance data calculated:', months);
    return months;
  }, [referrals]);

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Social sharing functions
  const shareViaWhatsApp = () => {
    const message = `Join Finaster MLM Platform and start earning! Use my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const message = `Join Finaster MLM Platform and start earning! Use my referral code: ${referralCode}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = 'Join Finaster MLM Platform and start earning!';
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'Join Finaster MLM Platform';
    const body = `Hi,\n\nI'd like to invite you to join Finaster MLM Platform. It's a great opportunity to earn passive income through trading and referrals.\n\nUse my referral link to sign up:\n${referralLink}\n\nOr use my referral code: ${referralCode}\n\nBest regards`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00C7D1] mx-auto mb-4"></div>
              <p className="text-[#cbd5e1] text-lg font-medium">Loading referrals...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#f8fafc] mb-2">Referrals</h1>
          <p className="text-[#94a3b8]">Invite friends and earn commission on their investments</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-[#00C7D1]/10 to-[#00C7D1]/5 border-[#00C7D1]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#00C7D1]/20 flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Total Referrals</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">{stats.totalReferrals}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border-[#10b981]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Active Referrals</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">{stats.activeReferrals}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#f59e0b]/10 to-[#f59e0b]/5 border-[#f59e0b]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Total Earnings</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">${stats.totalEarnings.toLocaleString()}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border-[#8b5cf6]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">This Month</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">{stats.thisMonthReferrals}</p>
            </div>
          </Card>
        </div>

        {/* Referral Link Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-6">Your Referral Link</h2>

            <div className="space-y-6">
              {/* Referral Link */}
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Referral Link</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  />
                  <Button onClick={() => copyToClipboard(referralLink, 'Referral link')} className="shrink-0">
                    📋 Copy Link
                  </Button>
                </div>
              </div>

              {/* Short Link */}
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Short Link</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={shortLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  />
                  <Button onClick={() => copyToClipboard(shortLink, 'Short link')} className="shrink-0">
                    📋 Copy Link
                  </Button>
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Referral Code</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={referralCode}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] font-mono text-xl focus:outline-none focus:border-[#00C7D1]"
                  />
                  <Button onClick={() => copyToClipboard(referralCode, 'Referral code')} className="shrink-0">
                    📋 Copy Code
                  </Button>
                </div>
              </div>

              {/* QR Code and Social Sharing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="flex flex-col items-center p-6 bg-[#1e293b] rounded-lg border border-[#334155]">
                  <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">QR Code</h3>
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <QRCodeSVG value={referralLink} size={150} />
                  </div>
                  <Button onClick={() => setShowQRModal(true)} variant="outline" size="sm">
                    View Full Size
                  </Button>
                </div>

                {/* Social Sharing */}
                <div className="p-6 bg-[#1e293b] rounded-lg border border-[#334155]">
                  <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">Share via Social Media</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={shareViaWhatsApp}
                      className="bg-[#25D366] hover:bg-[#1da851] border-0"
                    >
                      <span className="mr-2">📱</span> WhatsApp
                    </Button>
                    <Button
                      onClick={shareViaFacebook}
                      className="bg-[#1877f2] hover:bg-[#0c63d4] border-0"
                    >
                      <span className="mr-2">👍</span> Facebook
                    </Button>
                    <Button
                      onClick={shareViaTwitter}
                      className="bg-[#1DA1F2] hover:bg-[#0d8bd9] border-0"
                    >
                      <span className="mr-2">🐦</span> Twitter
                    </Button>
                    <Button
                      onClick={shareViaTelegram}
                      className="bg-[#0088cc] hover:bg-[#0077b3] border-0"
                    >
                      <span className="mr-2">✈️</span> Telegram
                    </Button>
                    <Button
                      onClick={shareViaEmail}
                      className="bg-[#ea4335] hover:bg-[#d33426] border-0 col-span-2"
                    >
                      <span className="mr-2">📧</span> Email
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Referral Performance Chart */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-6">Referral Performance</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis yAxisId="left" stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="referrals"
                    stroke="#00C7D1"
                    strokeWidth={2}
                    name="New Referrals"
                    dot={{ fill: '#00C7D1', r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Earnings ($)"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Direct Referrals Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-6">Direct Referrals</h2>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'earnings')}
                className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
              >
                <option value="date">Sort by Date</option>
                <option value="earnings">Sort by Earnings</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left py-3 px-4 text-[#cbd5e1] font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-[#cbd5e1] font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-[#cbd5e1] font-semibold">Join Date</th>
                    <th className="text-left py-3 px-4 text-[#cbd5e1] font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-[#cbd5e1] font-semibold">Investment</th>
                    <th className="text-right py-3 px-4 text-[#cbd5e1] font-semibold">Your Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#94a3b8]">
                        No referrals found
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((referral) => (
                      <tr
                        key={referral.id}
                        className="border-b border-[#334155] hover:bg-[#1e293b] transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white font-semibold">
                              {referral.name.charAt(0)}
                            </div>
                            <span className="text-[#f8fafc] font-medium">{referral.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#94a3b8]">{referral.email}</td>
                        <td className="py-4 px-4 text-[#94a3b8]">
                          {new Date(referral.joinDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={getStatusBadgeVariant(referral.status)}>
                            {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right text-[#f8fafc] font-semibold">
                          ${referral.investment.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right text-[#10b981] font-bold">
                          ${referral.earnings.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary */}
            {filteredReferrals.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#1e293b] rounded-lg">
                <div className="text-[#94a3b8]">
                  Showing <span className="text-[#f8fafc] font-semibold">{filteredReferrals.length}</span> of{' '}
                  <span className="text-[#f8fafc] font-semibold">{referrals.length}</span> referrals
                </div>
                <div className="text-[#94a3b8]">
                  Total Earnings from Direct Referrals:{' '}
                  <span className="text-[#10b981] font-bold text-xl">
                    ${filteredReferrals.reduce((sum, r) => sum + r.earnings, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* QR Code Modal */}
        <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Referral QR Code">
          <div className="flex flex-col items-center p-6">
            <div className="bg-white p-8 rounded-lg mb-6" id="qr-code-container">
              <QRCodeSVG value={referralLink} size={300} level="H" includeMargin={true} />
            </div>
            <p className="text-[#94a3b8] text-center mb-4">
              Scan this QR code to access your referral link
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const container = document.getElementById('qr-code-container');
                  const svg = container?.querySelector('svg');
                  if (svg) {
                    // Create a canvas to convert SVG to PNG
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const img = new Image();

                    // Set canvas size to match SVG
                    canvas.width = 300;
                    canvas.height = 300;

                    img.onload = () => {
                      // Fill white background
                      if (ctx) {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);

                        // Download the image
                        const url = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.download = 'finaster-referral-qr.png';
                        link.href = url;
                        link.click();
                        toast.success('QR code downloaded!');
                      }
                    };

                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  } else {
                    toast.error('Failed to download QR code');
                  }
                }}
              >
                📥 Download QR Code
              </Button>
              <Button onClick={() => setShowQRModal(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ReferralsNew;
