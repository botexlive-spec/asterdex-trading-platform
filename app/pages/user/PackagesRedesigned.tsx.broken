// @ts-nocheck - TODO: Migrate Supabase calls to MySQL backend API
/**
 * Redesigned Packages Page with Real-time Admin Sync
 * Features: Beautiful gradient cards, real-time updates, ROI calculator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Check,
  TrendingUp,
  Clock,
  Award,
  Star,
  Shield,
  Zap,
  Users,
  DollarSign,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Modal';

import { getWalletBalance, type WalletBalance } from '../../services/wallet.service';
import { purchasePackage } from '../../services/package.service';

// Package interface matching Supabase schema
interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  min_investment: number;
  max_investment: number;
  daily_return_percentage: number;
  max_return_percentage: number;
  duration_days: number;
  level_depth: number;
  binary_bonus_percentage: number;
  features: string[];
  status: 'active' | 'inactive';
  is_popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Purchase form schema
const purchaseSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is $100'),
  paymentPassword: z.string().min(6, 'Payment password is required'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

// Gradient themes for package cards
const packageThemes = [
  {
    gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
    hoverGradient: 'hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700',
    badge: 'bg-emerald-500',
    icon: '🌱',
    accentColor: 'text-emerald-400',
  },
  {
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-500 hover:via-blue-600 hover:to-blue-700',
    badge: 'bg-blue-500',
    icon: '📈',
    accentColor: 'text-blue-400',
  },
  {
    gradient: 'from-purple-400 via-purple-500 to-purple-600',
    hoverGradient: 'hover:from-purple-500 hover:via-purple-600 hover:to-purple-700',
    badge: 'bg-purple-500',
    icon: '💎',
    accentColor: 'text-purple-400',
  },
  {
    gradient: 'from-orange-400 via-orange-500 to-orange-600',
    hoverGradient: 'hover:from-orange-500 hover:via-orange-600 hover:to-orange-700',
    badge: 'bg-orange-500',
    icon: '🔥',
    accentColor: 'text-orange-400',
  },
];

export const PackagesRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  // Load packages and wallet balance
  useEffect(() => {
    loadPackages();
    loadWalletBalance();
  }, []);

  // Real-time subscription to package changes
//   useEffect(() => {
//       .channel('packages-channel')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'packages',
//         },
//         (payload) => {
//           console.log('Package change detected:', payload);
//           loadPackages(); // Reload packages when admin makes changes
//         }
//       )
//       .subscribe();
// 
//     return () => {
//       subscription.unsubscribe();
//     };
//   }, []);
// 
//   const loadPackages = async () => {
//     try {
//       setLoading(true);
//         .from('packages')
//         .select('*')
//         .eq('status', 'active')
//         .order('sort_order', { ascending: true });
// 
//       if (error) throw error;
// 
//       setPackages(data || []);
//     } catch (error: any) {
//       console.error('Failed to load packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const balance = await getWalletBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
    }
  };

  const handlePurchaseClick = (pkg: Package) => {
    // Check wallet balance
    if (walletBalance && walletBalance.available < (pkg.min_investment || pkg.price)) {
      toast.error(
        `Insufficient balance. You need at least $${pkg.min_investment || pkg.price} to purchase this package.`
      );
      return;
    }

    setSelectedPackage(pkg);
    setPurchaseAmount(pkg.min_investment || pkg.price);
    setValue('amount', pkg.min_investment || pkg.price);
    setShowPurchaseModal(true);
  };

  const handleAmountChange = (value: number) => {
    setPurchaseAmount(value);
    setValue('amount', value);
  };

  const onPurchaseSubmit = async (data: PurchaseFormData) => {
    if (!selectedPackage) return;

    setIsSubmitting(true);

    try {
      await purchasePackage({
        package_id: selectedPackage.id,
        amount: purchaseAmount,
        payment_password: data.paymentPassword,
      });

      toast.success('Package purchased successfully!');
      setShowPurchaseModal(false);
      reset();

      // Refresh wallet balance
      await loadWalletBalance();

      // Navigate to active packages
      setTimeout(() => {
        navigate('/packages');
      }, 1500);
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate ROI estimates
  const roiCalculations = useMemo(() => {
    if (!selectedPackage) return null;

    const dailyReturn = (purchaseAmount * selectedPackage.daily_return_percentage) / 100;
    const totalDays = selectedPackage.duration_days;
    const totalReturn = dailyReturn * totalDays;

    return {
      daily: dailyReturn,
      monthly: dailyReturn * 30,
      total: totalReturn,
      profit: totalReturn,
      roi: (totalReturn / purchaseAmount) * 100,
    };
  }, [purchaseAmount, selectedPackage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00C7D1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#cbd5e1] text-lg">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C7D1]/10 border border-[#00C7D1]/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#00C7D1]" />
            <span className="text-[#00C7D1] text-sm font-semibold">Investment Packages</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C7D1] to-[#00e5f0]">Investment Plan</span>
          </h1>
          <p className="text-xl text-[#cbd5e1] max-w-3xl mx-auto">
            Select a package that matches your investment goals and start earning daily returns with our proven MLM system
          </p>
        </div>

        {/* Wallet Balance Card */}
        {walletBalance && (
          <Card className="mb-12 bg-gradient-to-r from-[#334155] to-[#1e293b] border-[#475569]">
            <div className="p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[#94a3b8] text-sm mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-[#00C7D1]">
                  ${walletBalance.available?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Deposit Funds
              </Button>
            </div>
          </Card>
        )}

        {/* Package Cards Grid */}
        {packages.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-[#f8fafc] mb-2">No Packages Available</h3>
            <p className="text-[#cbd5e1]">Check back later for investment opportunities</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg, index) => {
              const theme = packageThemes[index % packageThemes.length];
              const hasBalance = walletBalance && walletBalance.available >= (pkg.min_investment || pkg.price);

              return (
                <div
                  key={pkg.id}
                  className={`relative group transform transition-all duration-300 hover:-translate-y-2 hover:scale-105`}
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>

                  {/* Card */}
                  <div className={`relative bg-gradient-to-br ${theme.gradient} ${theme.hoverGradient} rounded-3xl shadow-2xl overflow-hidden transition-all duration-300`}>
                    {/* Popular Badge */}
                    {pkg.is_popular && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <div className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 rotate-12 transform transition-transform group-hover:rotate-0">
                          <Star className="w-4 h-4 fill-current" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    {/* Card Content */}
                    <div className="p-8 text-white">
                      {/* Icon & Title */}
                      <div className="text-center mb-6">
                        <div className="text-6xl mb-4 transform transition-transform group-hover:scale-110 group-hover:rotate-12">
                          {theme.icon}
                        </div>
                        <h3 className="text-3xl font-bold mb-2">{pkg.name}</h3>
                        <p className="text-white/80 text-sm">{pkg.description}</p>
                      </div>

                      {/* Pricing */}
                      <div className="text-center mb-8 py-6 bg-white/10 backdrop-blur-sm rounded-2xl">
                        <div className="text-5xl font-bold mb-2">
                          ${pkg.min_investment?.toLocaleString() || pkg.price?.toLocaleString() || '0'}
                        </div>
                        {pkg.max_investment && pkg.max_investment > pkg.min_investment && (
                          <p className="text-white/70 text-sm">
                            Up to ${pkg.max_investment.toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Key Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                          <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-2xl font-bold">{pkg.daily_return_percentage}%</p>
                          <p className="text-xs text-white/70">Daily ROI</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Clock className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-2xl font-bold">{pkg.duration_days}</p>
                          <p className="text-xs text-white/70">Days</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Award className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-2xl font-bold">{pkg.level_depth}</p>
                          <p className="text-xs text-white/70">Levels</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                          <Users className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-2xl font-bold">{pkg.binary_bonus_percentage}%</p>
                          <p className="text-xs text-white/70">Binary</p>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {pkg.features && pkg.features.length > 0 ? (
                          pkg.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-white/90">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-white/90">Daily ROI payments</span>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-white/90">Level income up to {pkg.level_depth} levels</span>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-white/90">Binary matching bonus {pkg.binary_bonus_percentage}%</span>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-white/90">Rank achievement rewards</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Purchase Button */}
                      <button
                        onClick={() => handlePurchaseClick(pkg)}
                        disabled={!hasBalance}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                          hasBalance
                            ? 'bg-white text-gray-900 hover:bg-gray-100 hover:shadow-2xl transform hover:scale-105'
                            : 'bg-white/20 text-white/50 cursor-not-allowed'
                        }`}
                      >
                        {hasBalance ? (
                          <>
                            Purchase Now
                            <ArrowRight className="w-5 h-5" />
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            Insufficient Balance
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Purchase Modal */}
        {selectedPackage && (
          <Modal
            isOpen={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
            title={`Purchase ${selectedPackage.name} Package`}
            maxWidth="2xl"
          >
            <form onSubmit={handleSubmit(onPurchaseSubmit)} className="space-y-6">
              {/* Package Summary */}
              <div className="bg-gradient-to-r from-[#334155] to-[#1e293b] p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{selectedPackage.name}</h3>
                  <Badge variant="success">{selectedPackage.daily_return_percentage}% Daily ROI</Badge>
                </div>
                <p className="text-[#cbd5e1]">{selectedPackage.description}</p>
              </div>

              {/* Amount Slider */}
              {selectedPackage.max_investment && selectedPackage.max_investment > selectedPackage.min_investment ? (
                <div>
                  <label className="block text-[#f8fafc] mb-3 text-lg font-semibold">
                    Investment Amount: <span className="text-[#00C7D1]">${purchaseAmount.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    min={selectedPackage.min_investment}
                    max={selectedPackage.max_investment}
                    step={100}
                    value={purchaseAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full h-3 bg-[#475569] rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <div className="flex justify-between text-[#94a3b8] text-sm mt-2">
                    <span>Min: ${selectedPackage.min_investment.toLocaleString()}</span>
                    <span>Max: ${selectedPackage.max_investment.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-[#1e293b] rounded-xl">
                  <p className="text-[#94a3b8] mb-2">Fixed Investment Amount</p>
                  <p className="text-4xl font-bold text-[#00C7D1]">
                    ${(selectedPackage.min_investment || selectedPackage.price).toLocaleString()}
                  </p>
                </div>
              )}

              {/* ROI Calculator */}
              {roiCalculations && (
                <div className="bg-[#1e293b] p-6 rounded-xl space-y-4">
                  <h4 className="text-[#f8fafc] font-semibold text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#00C7D1]" />
                    Earnings Projection
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-[#334155] rounded-lg">
                      <p className="text-[#94a3b8] text-xs mb-1">Daily</p>
                      <p className="text-[#10b981] font-bold text-xl">${roiCalculations.daily.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-4 bg-[#334155] rounded-lg">
                      <p className="text-[#94a3b8] text-xs mb-1">Monthly</p>
                      <p className="text-[#10b981] font-bold text-xl">${roiCalculations.monthly.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-4 bg-[#334155] rounded-lg border-2 border-[#00C7D1]">
                      <p className="text-[#94a3b8] text-xs mb-1">Total</p>
                      <p className="text-[#00C7D1] font-bold text-xl">${roiCalculations.total.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#475569]">
                    <div>
                      <p className="text-[#94a3b8] text-sm">Total Return</p>
                      <p className="text-[#10b981] font-bold text-2xl">
                        ${(purchaseAmount + roiCalculations.total).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#94a3b8] text-sm">ROI</p>
                      <p className="text-[#00C7D1] font-bold text-2xl">{roiCalculations.roi.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Balance Info */}
              {walletBalance && (
                <div className="bg-[#1e293b] p-4 rounded-lg border-2 border-[#00C7D1]">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[#94a3b8] text-sm mb-1">Your Balance</p>
                      <p className="text-2xl font-bold text-[#00C7D1]">
                        ${walletBalance.available.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#94a3b8] text-sm mb-1">After Purchase</p>
                      <p className="text-xl font-bold text-[#f8fafc]">
                        ${(walletBalance.available - purchaseAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-[#f8fafc] mb-2 font-semibold">
                  Payment Password <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="password"
                  {...register('paymentPassword')}
                  className="w-full px-4 py-3 bg-[#1e293b] border border-[#475569] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  placeholder="Enter your account password"
                />
                {errors.paymentPassword && (
                  <p className="text-[#ef4444] text-sm mt-1">{errors.paymentPassword.message}</p>
                )}
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="mt-1 w-5 h-5 text-[#00C7D1] bg-[#475569] border-[#64748b] rounded"
                  />
                  <span className="text-[#cbd5e1] text-sm">
                    I agree to the terms and conditions, and understand that this investment is subject to the package duration and ROI policies.
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p className="text-[#ef4444] text-sm mt-1">{errors.termsAccepted.message}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 bg-gradient-to-r from-[#00C7D1] to-[#00e5f0]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : `Confirm Purchase - $${purchaseAmount.toLocaleString()}`}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00C7D1 0%, #00e5f0 100%);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 199, 209, 0.4);
          transition: all 0.2s;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 16px rgba(0, 199, 209, 0.6);
        }

        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00C7D1 0%, #00e5f0 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 199, 209, 0.4);
        }
      `}</style>
    </div>
  );
};

export default PackagesRedesigned;
