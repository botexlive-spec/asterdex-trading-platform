import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format, addMonths, differenceInDays } from 'date-fns';
import { Button, Card, Badge } from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { getUserRobotSubscription, purchaseRobotSubscription } from '../../services/mlm-client';

// Subscription status type
type SubscriptionStatus = 'active' | 'inactive' | 'expired';

// Benefits list
const benefits = [
  {
    icon: '🎯',
    title: 'Unlock 30-Level Income',
    description: 'Earn commissions from up to 30 levels deep in your network',
  },
  {
    icon: '⚖️',
    title: 'Binary Matching Eligibility',
    description: 'Qualify for lucrative binary matching bonuses',
  },
  {
    icon: '📦',
    title: 'Package Purchase Access',
    description: 'Unlock ability to purchase investment packages',
  },
  {
    icon: '🎧',
    title: 'Priority Support',
    description: '24/7 dedicated support with faster response times',
  },
  {
    icon: '🎁',
    title: 'Exclusive Bonuses',
    description: 'Access to special promotions and bonus opportunities',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    description: 'Detailed performance reports and earning insights',
  },
];

// Testimonials
const testimonials = [
  {
    id: 1,
    name: 'John Smith',
    role: 'Diamond Member',
    avatar: '👨‍💼',
    rating: 5,
    text: 'The Robot subscription transformed my earning potential! Within 2 months, I reached Diamond rank and my team grew exponentially.',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    role: 'Platinum Member',
    avatar: '👩‍💼',
    rating: 5,
    text: 'Best investment I made! The 30-level income alone paid for the subscription in the first month. Highly recommended!',
  },
  {
    id: 3,
    name: 'Michael Chen',
    role: 'Gold Member',
    avatar: '👨‍💻',
    rating: 5,
    text: 'Priority support is amazing. Any questions I have are answered immediately. The exclusive bonuses are the cherry on top!',
  },
];

// Purchase validation schema
const purchaseSchema = z.object({
  paymentMethod: z.enum(['wallet', 'crypto', 'bank'], {
    required_error: 'Please select a payment method',
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export const RobotNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<{
    status: SubscriptionStatus;
    startDate: Date | null;
    endDate: Date | null;
    autoRenew: boolean;
  }>({
    status: 'inactive',
    startDate: null,
    endDate: null,
    autoRenew: false,
  });
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const paymentMethod = watch('paymentMethod');

  // Load user's robot subscription
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available for robot subscription');
        return;
      }

      console.log('🤖 Fetching robot subscription for user:', user.email, 'ID:', user.id);
      setLoading(true);

      try {
        // Add 10-second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        const subscriptionPromise = getUserRobotSubscription(user.id);

        const subscriptionData = await Promise.race([subscriptionPromise, timeoutPromise]) as any;

        console.log('✅ Robot subscription data received:', subscriptionData);

        if (subscriptionData) {
          const now = new Date();
          const expiresAt = new Date(subscriptionData.expires_at);
          const status: SubscriptionStatus = expiresAt > now ? 'active' : 'expired';

          setSubscription({
            status,
            startDate: new Date(subscriptionData.purchased_at),
            endDate: expiresAt,
            autoRenew: subscriptionData.auto_renew,
          });

          toast.success('Robot subscription loaded');
        } else {
          console.log('ℹ️ No active robot subscription found');
          setSubscription({
            status: 'inactive',
            startDate: null,
            endDate: null,
            autoRenew: false,
          });
        }
      } catch (error: any) {
        console.error('❌ Error fetching robot subscription:', error);
        toast.error(error.message || 'Failed to load robot subscription');
        setSubscription({
          status: 'inactive',
          startDate: null,
          endDate: null,
          autoRenew: false,
        });
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user?.id]);

  // Countdown timer effect - Set target end date (7 days from now)
  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7); // 7 days from now

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const onPurchaseSubmit = async (data: PurchaseFormData) => {
    const purchasePromise = purchaseRobotSubscription();

    toast.promise(purchasePromise, {
      loading: 'Processing your purchase...',
      success: 'Robot activated successfully! 🎉',
      error: (error) => error?.message || 'Purchase failed. Please try again.',
    });

    try {
      await purchasePromise;
      setShowPurchaseModal(false);
      setShowSuccessModal(true);
      // Update subscription status
      setSubscription({
        status: 'active',
        startDate: new Date(),
        endDate: addMonths(new Date(), 1),
        autoRenew: false,
      });
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  const handleRenew = () => {
    setShowPurchaseModal(true);
  };

  const daysRemaining = subscription.endDate
    ? differenceInDays(subscription.endDate, new Date())
    : 0;

  return (
    <div className="min-h-screen bg-[#1e293b]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] py-20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLTItNC00LTRzLTQgMi00IDQgMiA0IDQgNCA0LTIgNC00eiIvPjwvZz48L2c+PC9zdmc+')] bg-repeat" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <span className="text-2xl">🤖</span>
                <span className="text-white font-semibold">Premium Subscription</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Unlock Unlimited
                <br />
                <span className="text-[#ffd700]">Earning Potential</span>
              </h1>

              <p className="text-xl text-white/90 mb-8">
                Activate your Robot subscription and unlock exclusive features that will 10x your
                earning potential in the Finaster ecosystem.
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">$100</span>
                  <span className="text-xl text-white/80">/ month</span>
                </div>
                <Badge variant="warning" className="text-lg px-4 py-2">
                  Limited Time Offer
                </Badge>
              </div>

              {subscription.status === 'inactive' && (
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-white text-[#667eea] hover:bg-white/90 px-8 py-4 text-lg"
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Activate Now
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                    onClick={() => {
                      document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Learn More
                  </Button>
                </div>
              )}
            </div>

            {/* Visual Illustration */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="text-center mb-6">
                  <div className="text-8xl mb-4">🤖</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Robot Activated</h3>
                  <p className="text-white/80">Join 10,000+ active members</p>
                </div>

                <div className="space-y-4">
                  {['30-Level Income', 'Binary Matching', 'Exclusive Bonuses'].map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold">
                        ✓
                      </div>
                      <span className="text-white font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Countdown Timer for Special Offer */}
        <Card className="mb-8 bg-gradient-to-r from-[#ff6b6b] to-[#ee5a6f] border-none">
          <div className="text-center py-6">
            <p className="text-white text-lg mb-4">
              🔥 <strong>Special Launch Offer Ends In:</strong>
            </p>
            <div className="flex justify-center gap-4">
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hours', value: countdown.hours },
                { label: 'Minutes', value: countdown.minutes },
                { label: 'Seconds', value: countdown.seconds },
              ].map((item) => (
                <div key={item.label} className="bg-white/20 backdrop-blur-sm rounded-lg p-4 min-w-[100px]">
                  <div className="text-4xl font-bold text-white">{String(item.value).padStart(2, '0')}</div>
                  <div className="text-white/80 text-sm mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Subscription Status */}
        <Card className="mb-12">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-6">Subscription Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1e293b] p-6 rounded-lg">
                <p className="text-[#94a3b8] text-sm mb-2">Status</p>
                <div className="flex items-center gap-2">
                  {subscription.status === 'active' && (
                    <>
                      <span className="text-3xl">✅</span>
                      <span className="text-2xl font-bold text-[#10b981]">Active</span>
                    </>
                  )}
                  {subscription.status === 'inactive' && (
                    <>
                      <span className="text-3xl">❌</span>
                      <span className="text-2xl font-bold text-[#ef4444]">Inactive</span>
                    </>
                  )}
                  {subscription.status === 'expired' && (
                    <>
                      <span className="text-3xl">⏰</span>
                      <span className="text-2xl font-bold text-[#f59e0b]">Expired</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-lg">
                <p className="text-[#94a3b8] text-sm mb-2">Expiry Date</p>
                <p className="text-2xl font-bold text-[#f8fafc]">
                  {subscription.endDate ? format(subscription.endDate, 'MMM dd, yyyy') : 'N/A'}
                </p>
                {subscription.status === 'active' && daysRemaining > 0 && (
                  <p className="text-sm text-[#94a3b8] mt-1">{daysRemaining} days remaining</p>
                )}
              </div>

              <div className="bg-[#1e293b] p-6 rounded-lg">
                <p className="text-[#94a3b8] text-sm mb-2">Auto-Renewal</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{subscription.autoRenew ? '🔄' : '⏸️'}</span>
                  <span className="text-xl font-bold text-[#f8fafc]">
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Based on Status */}
            <div className="mt-6">
              {subscription.status === 'inactive' && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={() => setShowConfirmModal(true)}
                >
                  Activate Robot Subscription - $100/month
                </Button>
              )}

              {subscription.status === 'active' && daysRemaining <= 7 && (
                <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-[#92400e] font-semibold mb-2">
                        Your subscription expires in {daysRemaining} days
                      </p>
                      <Button variant="warning" onClick={handleRenew}>
                        Renew Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {subscription.status === 'expired' && (
                <div className="bg-[#fef2f2] border border-[#ef4444] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎁</span>
                    <div className="flex-1">
                      <p className="text-[#991b1b] font-semibold mb-2">
                        Reactivate now and get <strong>20% OFF</strong> your next month!
                      </p>
                      <Button
                        variant="danger"
                        onClick={() => setShowConfirmModal(true)}
                      >
                        Reactivate with 20% Discount - $80
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Benefits Section */}
        <section id="benefits" className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#f8fafc] mb-4">Unlock Premium Benefits</h2>
            <p className="text-xl text-[#cbd5e1]">
              Transform your earning potential with exclusive Robot subscription features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="hover:scale-105 transition-transform duration-300">
                <div className="p-6">
                  <div className="text-5xl mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-bold text-[#f8fafc] mb-3">{benefit.title}</h3>
                  <p className="text-[#cbd5e1]">{benefit.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#f8fafc] mb-4">
              With vs Without Robot
            </h2>
            <p className="text-xl text-[#cbd5e1]">See the difference Robot subscription makes</p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#475569]">
                    <th className="text-left py-4 px-6 text-[#cbd5e1]">Feature</th>
                    <th className="text-center py-4 px-6">
                      <div className="text-[#ef4444] font-bold">Without Robot</div>
                    </th>
                    <th className="text-center py-4 px-6">
                      <div className="text-[#10b981] font-bold">With Robot</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Level Income Depth', without: '5 Levels', with: '30 Levels' },
                    { feature: 'Binary Matching', without: '❌', with: '✅' },
                    { feature: 'Package Purchase', without: '❌', with: '✅' },
                    { feature: 'Support Priority', without: 'Standard', with: 'Priority 24/7' },
                    { feature: 'Exclusive Bonuses', without: '❌', with: '✅' },
                    { feature: 'Advanced Analytics', without: 'Basic', with: 'Advanced' },
                    { feature: 'Rank Advancement Speed', without: 'Normal', with: '3x Faster' },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-[#475569] hover:bg-[#334155]">
                      <td className="py-4 px-6 text-[#f8fafc] font-medium">{row.feature}</td>
                      <td className="py-4 px-6 text-center text-[#ef4444]">{row.without}</td>
                      <td className="py-4 px-6 text-center text-[#10b981] font-semibold">{row.with}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Testimonials */}
        <section className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#f8fafc] mb-4">What Our Members Say</h2>
            <p className="text-xl text-[#cbd5e1]">Join thousands of satisfied Robot subscribers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="hover:scale-105 transition-transform duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl">{testimonial.avatar}</div>
                    <div>
                      <h4 className="text-lg font-bold text-[#f8fafc]">{testimonial.name}</h4>
                      <p className="text-sm text-[#94a3b8]">{testimonial.role}</p>
                    </div>
                  </div>

                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, idx) => (
                      <span key={idx} className="text-[#fbbf24] text-xl">⭐</span>
                    ))}
                  </div>

                  <p className="text-[#cbd5e1] italic">"{testimonial.text}"</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        {subscription.status === 'inactive' && (
          <Card className="bg-gradient-to-r from-[#667eea] to-[#764ba2] border-none">
            <div className="text-center py-12 px-6">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to 10x Your Earnings?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join 10,000+ members who have unlocked their full earning potential with Robot
                subscription
              </p>
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-[#667eea] hover:bg-white/90 px-12 py-4 text-lg"
                onClick={() => setShowConfirmModal(true)}
              >
                Activate Robot Now - $100/month
              </Button>
              <p className="text-white/80 mt-4 text-sm">
                💳 Secure payment • 🔒 Cancel anytime • 🎁 30-day money-back guarantee
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Robot Activation"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-[#f8fafc] mb-4">
              Activate Robot Subscription?
            </h3>
            <p className="text-[#cbd5e1] mb-4">
              You're about to activate your Robot subscription for <strong className="text-[#00C7D1]">$100/month</strong>.
            </p>
          </div>

          <div className="bg-[#1e293b] p-4 rounded-lg">
            <h4 className="text-[#f8fafc] font-semibold mb-3">You'll get instant access to:</h4>
            <ul className="space-y-2">
              {benefits.slice(0, 5).map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[#cbd5e1]">
                  <span className="text-[#10b981]">✓</span>
                  <span>{benefit.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowConfirmModal(false);
                setShowPurchaseModal(true);
              }}
              className="flex-1 bg-gradient-to-r from-[#667eea] to-[#764ba2]"
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Purchase Modal */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Activate Robot Subscription"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onPurchaseSubmit)} className="space-y-6">
          {/* Subscription Summary */}
          <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] p-6 rounded-lg">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90">Monthly Subscription</p>
                <h3 className="text-3xl font-bold">$100 / month</h3>
              </div>
              <div className="text-6xl">🤖</div>
            </div>
          </div>

          {/* What You Get */}
          <div className="bg-[#1e293b] p-6 rounded-lg">
            <h4 className="text-[#f8fafc] font-semibold mb-4">What's Included:</h4>
            <ul className="space-y-2">
              {benefits.slice(0, 5).map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[#cbd5e1]">
                  <span className="text-[#10b981] mt-1">✓</span>
                  <span>{benefit.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[#cbd5e1] mb-3 font-semibold">Select Payment Method</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'wallet', label: 'Wallet Balance', icon: '💰' },
                { value: 'crypto', label: 'Cryptocurrency', icon: '₿' },
                { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
              ].map((method) => (
                <label
                  key={method.value}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === method.value
                      ? 'border-[#00C7D1] bg-[#00C7D1]/10'
                      : 'border-[#475569] hover:border-[#64748b]'
                  }`}
                >
                  <input
                    type="radio"
                    value={method.value}
                    {...register('paymentMethod')}
                    className="sr-only"
                  />
                  <div className="text-4xl mb-2">{method.icon}</div>
                  <span className="text-[#cbd5e1] text-sm text-center">{method.label}</span>
                </label>
              ))}
            </div>
            {errors.paymentMethod && (
              <p className="text-[#ef4444] text-sm mt-2">{errors.paymentMethod.message}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('termsAccepted')}
                className="mt-1 w-5 h-5 text-[#00C7D1] bg-[#475569] border-[#64748b] rounded focus:ring-[#00C7D1]"
              />
              <span className="text-[#cbd5e1] text-sm">
                I agree to the subscription terms and understand that my subscription will
                automatically renew monthly at $100 until cancelled. I can cancel anytime from my
                account settings.
              </span>
            </label>
            {errors.termsAccepted && (
              <p className="text-[#ef4444] text-sm mt-2">{errors.termsAccepted.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPurchaseModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 bg-gradient-to-r from-[#667eea] to-[#764ba2]"
            >
              Confirm & Activate - $100
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="🎉 Robot Activated!"
        maxWidth="md"
      >
        <div className="text-center py-8">
          <div className="text-8xl mb-4">🤖</div>
          <h3 className="text-3xl font-bold text-[#10b981] mb-4">
            Congratulations!
          </h3>
          <p className="text-[#cbd5e1] mb-8">
            Your Robot subscription has been activated successfully. You now have access to all
            premium features!
          </p>

          <div className="bg-[#1e293b] p-6 rounded-lg mb-8">
            <h4 className="text-[#f8fafc] font-semibold mb-4">Next Steps:</h4>
            <ul className="text-left space-y-3">
              <li className="flex items-start gap-2 text-[#cbd5e1]">
                <span className="text-[#10b981]">1.</span>
                <span>Explore the Dashboard to see your new earning potential</span>
              </li>
              <li className="flex items-start gap-2 text-[#cbd5e1]">
                <span className="text-[#10b981]">2.</span>
                <span>Purchase investment packages to start earning</span>
              </li>
              <li className="flex items-start gap-2 text-[#cbd5e1]">
                <span className="text-[#10b981]">3.</span>
                <span>Build your team and unlock 30-level income</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSuccessModal(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RobotNew;
