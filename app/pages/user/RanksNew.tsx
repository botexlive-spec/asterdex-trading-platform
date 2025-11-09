import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { getAllRankRewards, getUserRankAchievements, calculateRankEligibility } from '../../services/admin-rank.service';
import { getUserDashboard } from '../../services/mlm-client';
import { useAuth } from "../../context/AuthContext";

interface RankRequirement {
  personalInvestment: number;
  teamVolume: number;
  directReferrals: number;
  activeTeamMembers: number;
}

interface Rank {
  id: number;
  name: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  requirements: RankRequirement;
  rewardAmount: number;
  benefits: string[];
  unlocked: boolean;
}

interface RankAchievement {
  rankId: number;
  rankName: string;
  achievedDate: string;
  rewardClaimed: number;
}

const RanksNew: React.FC = () => {
  const { user } = useAuth();
  const [selectedRankForDetails, setSelectedRankForDetails] = useState<Rank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allRanks, setAllRanks] = useState<Rank[]>([]);
  const [currentRank, setCurrentRank] = useState<Rank | null>(null);
  const [currentProgress, setCurrentProgress] = useState({
    personalInvestment: 0,
    teamVolume: 0,
    directReferrals: 0,
    activeTeamMembers: 0
  });
  const [achievementHistory, setAchievementHistory] = useState<RankAchievement[]>([]);

  // Static UI configuration for ranks (icons, colors, gradients, benefits text)
  const rankUIConfig = [
    {
      id: 1,
      name: 'Starter',
      icon: '🌱',
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      requirements: {
        personalInvestment: 100,
        teamVolume: 0,
        directReferrals: 0,
        activeTeamMembers: 0
      },
      rewardAmount: 0,
      benefits: ['Access to platform', 'Basic ROI earnings', 'Referral commissions'],
      unlocked: true
    },
    {
      id: 2,
      name: 'Bronze',
      icon: '🥉',
      color: '#cd7f32',
      gradientFrom: '#cd7f32',
      gradientTo: '#8b5a2b',
      requirements: {
        personalInvestment: 500,
        teamVolume: 2000,
        directReferrals: 3,
        activeTeamMembers: 10
      },
      rewardAmount: 100,
      benefits: ['5% bonus on direct referrals', 'Priority support', 'Bronze badge'],
      unlocked: true
    },
    {
      id: 3,
      name: 'Silver',
      icon: '🥈',
      color: '#c0c0c0',
      gradientFrom: '#c0c0c0',
      gradientTo: '#a8a8a8',
      requirements: {
        personalInvestment: 1000,
        teamVolume: 5000,
        directReferrals: 5,
        activeTeamMembers: 25
      },
      rewardAmount: 500,
      benefits: ['10% bonus on direct referrals', 'Level income up to 15 levels', 'Monthly rank bonus', 'Silver badge'],
      unlocked: true
    },
    {
      id: 4,
      name: 'Gold',
      icon: '🥇',
      color: '#ffd700',
      gradientFrom: '#ffd700',
      gradientTo: '#daa520',
      requirements: {
        personalInvestment: 2500,
        teamVolume: 15000,
        directReferrals: 8,
        activeTeamMembers: 50
      },
      rewardAmount: 1500,
      benefits: ['15% bonus on direct referrals', 'Level income up to 20 levels', 'Binary matching bonus', 'Gold badge', 'VIP support'],
      unlocked: false
    },
    {
      id: 5,
      name: 'Platinum',
      icon: '💎',
      color: '#e5e4e2',
      gradientFrom: '#e5e4e2',
      gradientTo: '#b0b0b0',
      requirements: {
        personalInvestment: 5000,
        teamVolume: 50000,
        directReferrals: 12,
        activeTeamMembers: 100
      },
      rewardAmount: 5000,
      benefits: ['20% bonus on direct referrals', 'Level income up to 25 levels', 'Car bonus eligibility', 'Platinum badge', 'Annual trip eligibility'],
      unlocked: false
    },
    {
      id: 6,
      name: 'Diamond',
      icon: '💠',
      color: '#b9f2ff',
      gradientFrom: '#b9f2ff',
      gradientTo: '#00bfff',
      requirements: {
        personalInvestment: 10000,
        teamVolume: 150000,
        directReferrals: 15,
        activeTeamMembers: 250
      },
      rewardAmount: 15000,
      benefits: ['25% bonus on direct referrals', 'Level income up to 30 levels', 'House fund bonus', 'Diamond badge', 'Leadership pool share'],
      unlocked: false
    },
    {
      id: 7,
      name: 'Ruby',
      icon: '🔴',
      color: '#e0115f',
      gradientFrom: '#e0115f',
      gradientTo: '#9b0039',
      requirements: {
        personalInvestment: 25000,
        teamVolume: 500000,
        directReferrals: 20,
        activeTeamMembers: 500
      },
      rewardAmount: 50000,
      benefits: ['30% bonus on direct referrals', 'Full level income (30 levels)', 'Luxury car bonus', 'Ruby badge', 'Global profit share', 'Exclusive retreats'],
      unlocked: false
    },
    {
      id: 8,
      name: 'Emerald',
      icon: '🟢',
      color: '#50c878',
      gradientFrom: '#50c878',
      gradientTo: '#009e60',
      requirements: {
        personalInvestment: 50000,
        teamVolume: 1500000,
        directReferrals: 25,
        activeTeamMembers: 1000
      },
      rewardAmount: 150000,
      benefits: ['35% bonus on direct referrals', 'Estate fund bonus', 'Emerald badge', 'Board of directors eligibility', 'Equity options'],
      unlocked: false
    },
    {
      id: 9,
      name: 'Sapphire',
      icon: '🔵',
      color: '#0f52ba',
      gradientFrom: '#0f52ba',
      gradientTo: '#082b5e',
      requirements: {
        personalInvestment: 100000,
        teamVolume: 5000000,
        directReferrals: 30,
        activeTeamMembers: 2500
      },
      rewardAmount: 500000,
      benefits: ['40% bonus on direct referrals', 'Private jet trips', 'Sapphire badge', 'Company equity', 'Lifetime passive income', 'Legacy builder status'],
      unlocked: false
    },
    {
      id: 10,
      name: 'Crown Diamond',
      icon: '👑',
      color: '#b80be8',
      gradientFrom: '#b80be8',
      gradientTo: '#7a0999',
      requirements: {
        personalInvestment: 250000,
        teamVolume: 15000000,
        directReferrals: 50,
        activeTeamMembers: 5000
      },
      rewardAmount: 1000000,
      benefits: ['50% bonus on direct referrals', 'Ultimate recognition', 'Crown Diamond badge', 'Global ambassador', 'Exclusive yacht trips', 'Million dollar club', 'Immortalized in company history'],
      unlocked: false
    }
  ];

  // Load real rank data from database
  useEffect(() => {
    const loadRankData = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available for rank data');
        return;
      }

      console.log('📊 Fetching rank data for user:', user.email, 'ID:', user.id);
      setLoading(true);
      setError(null);

      try {
        // Add 10-second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        // Fetch rank eligibility (includes current rank, progress, all ranks)
        const eligibilityPromise = calculateRankEligibility(user.id);
        const achievementsPromise = getUserRankAchievements(user.id);
        const dashboardPromise = getUserDashboard(user.id);

        const [eligibilityData, achievementsData, dashboardData] = await Promise.race([
          Promise.all([eligibilityPromise, achievementsPromise, dashboardPromise]),
          timeoutPromise
        ]) as any;

        console.log('✅ Rank eligibility data received:', eligibilityData);
        console.log('✅ Achievements data received:', achievementsData);
        console.log('✅ Dashboard data received:', dashboardData);

        // Merge database ranks with UI config
        const mergedRanks = eligibilityData.eligibleRanks.map((rankElig: any, index: number) => {
          const uiConfig = rankUIConfig[index] || rankUIConfig[0];
          return {
            id: rankElig.rank.rank_order,
            name: rankElig.rank.rank_name,
            icon: uiConfig.icon,
            color: uiConfig.color,
            gradientFrom: uiConfig.gradientFrom,
            gradientTo: uiConfig.gradientTo,
            requirements: {
              personalInvestment: rankElig.rank.min_personal_sales,
              teamVolume: rankElig.rank.min_team_volume,
              directReferrals: rankElig.rank.min_direct_referrals,
              activeTeamMembers: rankElig.rank.min_active_directs
            },
            rewardAmount: rankElig.rank.reward_amount,
            benefits: uiConfig.benefits || [],
            unlocked: rankElig.qualified
          };
        });

        setAllRanks(mergedRanks);

        // Set current rank
        const currentRankData = mergedRanks.find((r: Rank) =>
          eligibilityData.currentRank && r.name === eligibilityData.currentRank
        );
        setCurrentRank(currentRankData || mergedRanks[0]);

        // Set current progress from dashboard
        setCurrentProgress({
          personalInvestment: dashboardData.totalInvestment || 0,
          teamVolume: dashboardData.teamVolume || 0,
          directReferrals: dashboardData.directReferrals || 0,
          activeTeamMembers: dashboardData.activeTeamMembers || 0
        });

        // Transform achievement history
        const transformedAchievements = achievementsData.map((achievement: any) => ({
          rankId: 0, // We don't have rank ID in the response
          rankName: achievement.rank_name,
          achievedDate: new Date(achievement.created_at).toISOString().split('T')[0],
          rewardClaimed: achievement.reward_amount
        }));
        setAchievementHistory(transformedAchievements);

        toast.success('Rank data loaded');
      } catch (error: any) {
        console.error('❌ Error fetching rank data:', error);
        setError(error.message || 'Failed to load rank data');
        toast.error(error.message || 'Failed to load rank data');

        // Fall back to default values
        setAllRanks(rankUIConfig);
        setCurrentRank(rankUIConfig[0]);
      } finally {
        setLoading(false);
      }
    };

    loadRankData();
  }, [user?.id]);

  // Calculate next rank (one level above current rank)
  const nextRank = currentRank && allRanks.length > 0
    ? allRanks.find(r => r.id === currentRank.id + 1) || allRanks[allRanks.length - 1]
    : allRanks[0];

  // Calculate progress percentages
  const progressPercentages = nextRank ? {
    personalInvestment: (currentProgress.personalInvestment / nextRank.requirements.personalInvestment) * 100,
    teamVolume: (currentProgress.teamVolume / nextRank.requirements.teamVolume) * 100,
    directReferrals: (currentProgress.directReferrals / nextRank.requirements.directReferrals) * 100,
    activeTeamMembers: (currentProgress.activeTeamMembers / nextRank.requirements.activeTeamMembers) * 100
  } : {
    personalInvestment: 0,
    teamVolume: 0,
    directReferrals: 0,
    activeTeamMembers: 0
  };

  const overallProgress = Object.values(progressPercentages).reduce((a, b) => a + b, 0) / 4;

  // Estimate time to achieve (simplified)
  const estimatedDaysToAchieve = Math.ceil((100 - overallProgress) * 2); // Rough estimate

  // Benefits comparison data
  const benefitCategories = [
    'Direct Referral Bonus',
    'Level Income Depth',
    'Binary Matching',
    'Priority Support',
    'Monthly Bonus',
    'Car Bonus',
    'House/Estate Fund',
    'Leadership Pool',
    'Global Profit Share',
    'Company Equity',
    'Lifetime Income',
    'Exclusive Events'
  ];

  const benefitsMatrix: Record<string, string[]> = {
    'Direct Referral Bonus': ['0%', '5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '50%'],
    'Level Income Depth': ['10', '12', '15', '20', '25', '30', '30', '30', '30', '30'],
    'Binary Matching': ['❌', '❌', '❌', '✅', '✅', '✅', '✅', '✅', '✅', '✅'],
    'Priority Support': ['❌', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'],
    'Monthly Bonus': ['❌', '❌', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'],
    'Car Bonus': ['❌', '❌', '❌', '❌', '✅', '✅', '✅', '✅', '✅', '✅'],
    'House/Estate Fund': ['❌', '❌', '❌', '❌', '❌', '✅', '✅', '✅', '✅', '✅'],
    'Leadership Pool': ['❌', '❌', '❌', '❌', '❌', '✅', '✅', '✅', '✅', '✅'],
    'Global Profit Share': ['❌', '❌', '❌', '❌', '❌', '❌', '✅', '✅', '✅', '✅'],
    'Company Equity': ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '✅', '✅'],
    'Lifetime Income': ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '❌', '✅', '✅'],
    'Exclusive Events': ['❌', '❌', '❌', '❌', '✅', '✅', '✅', '✅', '✅', '✅']
  };

  // Show loading state if data not loaded
  if (loading || !currentRank) {
    return (
      <>
        <Helmet>
          <title>Ranks - Asterdex</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ranks...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ranks - Asterdex</title>
      </Helmet>

      <div className="space-y-8">
        {/* Current Rank Display */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${currentRank?.gradientFrom || '#10b981'}, ${currentRank?.gradientTo || '#059669'})`
          }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Rank Icon/Badge */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/40 shadow-xl">
                  <span className="text-7xl md:text-8xl">{currentRank?.icon || '🌱'}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-4 py-2 shadow-lg">
                  <span className="text-sm font-bold" style={{ color: currentRank?.color || '#10b981' }}>
                    Rank {currentRank?.id || 1}
                  </span>
                </div>
              </div>

              {/* Rank Details */}
              <div className="flex-1 text-center md:text-left">
                <div className="text-white/80 text-sm font-medium mb-2">CURRENT RANK</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{currentRank?.name || 'Loading...'}</h1>
                <div className="text-white/90 text-lg mb-4">
                  Achieved on {new Date('2024-10-10').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>

                {/* Benefits Unlocked */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-white/80 text-sm font-medium mb-2">BENEFITS UNLOCKED</div>
                  <div className="flex flex-wrap gap-2">
                    {(currentRank?.benefits || []).map((benefit, index) => (
                      <span
                        key={index}
                        className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/30"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievement Count */}
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-white/80 text-sm font-medium mb-2">REWARDS EARNED</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    ${achievementHistory.reduce((sum, a) => sum + a.rewardClaimed, 0).toLocaleString()}
                  </div>
                  <div className="text-white/70 text-xs">From {achievementHistory.length} ranks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Progress */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white">Progress to {nextRank.name}</h2>
              <div className="text-right">
                <div className="text-3xl font-bold text-cyan-400">{overallProgress.toFixed(1)}%</div>
                <div className="text-gray-400 text-sm">Complete</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Complete the requirements below to unlock the {nextRank.name} rank
            </p>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-8">
            <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 flex items-center justify-end pr-3"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              >
                {overallProgress > 10 && (
                  <span className="text-white text-xs font-bold">{overallProgress.toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{currentRank.name}</span>
              <span>Est. {estimatedDaysToAchieve} days to {nextRank.name}</span>
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="space-y-6">
            {/* Personal Investment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    progressPercentages.personalInvestment >= 100
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}>
                    {progressPercentages.personalInvestment >= 100 ? (
                      <span className="text-white text-xs">✓</span>
                    ) : (
                      <span className="text-white text-xs">•</span>
                    )}
                  </div>
                  <span className="text-white font-medium">Personal Investment</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    ${currentProgress.personalInvestment.toLocaleString()}
                  </span>
                  <span className="text-gray-400"> / ${nextRank.requirements.personalInvestment.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(progressPercentages.personalInvestment, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {progressPercentages.personalInvestment.toFixed(1)}% Complete
              </div>
            </div>

            {/* Team Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    progressPercentages.teamVolume >= 100
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}>
                    {progressPercentages.teamVolume >= 100 ? (
                      <span className="text-white text-xs">✓</span>
                    ) : (
                      <span className="text-white text-xs">•</span>
                    )}
                  </div>
                  <span className="text-white font-medium">Team Volume</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    ${currentProgress.teamVolume.toLocaleString()}
                  </span>
                  <span className="text-gray-400"> / ${nextRank.requirements.teamVolume.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${Math.min(progressPercentages.teamVolume, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {progressPercentages.teamVolume.toFixed(1)}% Complete
              </div>
            </div>

            {/* Direct Referrals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    progressPercentages.directReferrals >= 100
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}>
                    {progressPercentages.directReferrals >= 100 ? (
                      <span className="text-white text-xs">✓</span>
                    ) : (
                      <span className="text-white text-xs">•</span>
                    )}
                  </div>
                  <span className="text-white font-medium">Direct Referrals</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    {currentProgress.directReferrals}
                  </span>
                  <span className="text-gray-400"> / {nextRank.requirements.directReferrals}</span>
                </div>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.min(progressPercentages.directReferrals, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {progressPercentages.directReferrals.toFixed(1)}% Complete
              </div>
            </div>

            {/* Active Team Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    progressPercentages.activeTeamMembers >= 100
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}>
                    {progressPercentages.activeTeamMembers >= 100 ? (
                      <span className="text-white text-xs">✓</span>
                    ) : (
                      <span className="text-white text-xs">•</span>
                    )}
                  </div>
                  <span className="text-white font-medium">Active Team Members</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    {currentProgress.activeTeamMembers}
                  </span>
                  <span className="text-gray-400"> / {nextRank.requirements.activeTeamMembers}</span>
                </div>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(progressPercentages.activeTeamMembers, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {progressPercentages.activeTeamMembers.toFixed(1)}% Complete
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="mt-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/30 rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-white font-semibold mb-2">
              You're {(100 - overallProgress).toFixed(1)}% away from {nextRank.name}!
            </div>
            <div className="text-gray-300 text-sm">
              Keep up the great work. Your next reward of ${nextRank.rewardAmount.toLocaleString()} is within reach!
            </div>
          </div>
        </Card>

        {/* Rank Roadmap */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Rank Roadmap</h2>
            <p className="text-gray-400 text-sm">Your journey to the top - Click any rank to see details</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {allRanks.map((rank, index) => {
              const isUnlocked = rank.unlocked;
              const isCurrent = rank.id === currentRank.id;

              return (
                <div
                  key={rank.id}
                  onClick={() => setSelectedRankForDetails(rank)}
                  className={`relative cursor-pointer group transition-all duration-300 ${
                    isUnlocked ? 'hover:scale-105' : 'opacity-60'
                  }`}
                >
                  <div
                    className={`relative rounded-xl p-6 border-2 transition-all ${
                      isCurrent
                        ? 'border-cyan-400 shadow-lg shadow-cyan-500/50'
                        : isUnlocked
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-700'
                    }`}
                    style={{
                      background: isUnlocked
                        ? `linear-gradient(135deg, ${rank.gradientFrom}20, ${rank.gradientTo}20)`
                        : 'rgba(31, 41, 55, 0.5)'
                    }}
                  >
                    {/* Lock/Unlock Indicator */}
                    {!isUnlocked && (
                      <div className="absolute top-2 right-2 bg-gray-900 rounded-full p-1.5">
                        <span className="text-gray-500 text-sm">🔒</span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                          CURRENT RANK
                        </div>
                      </div>
                    )}

                    {/* Rank Icon */}
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-2 group-hover:scale-110 transition-transform">
                        {rank.icon}
                      </div>
                      <div
                        className="text-xl font-bold mb-1"
                        style={{ color: isUnlocked ? rank.color : '#6b7280' }}
                      >
                        {rank.name}
                      </div>
                      <div className="text-gray-400 text-xs">Rank {rank.id}</div>
                    </div>

                    {/* Requirements Summary */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-gray-300">
                        <span>Investment:</span>
                        <span className="font-semibold">${rank.requirements.personalInvestment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Team Vol:</span>
                        <span className="font-semibold">${rank.requirements.teamVolume.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Referrals:</span>
                        <span className="font-semibold">{rank.requirements.directReferrals}</span>
                      </div>
                    </div>

                    {/* Reward */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-center">
                        <div className="text-gray-400 text-xs mb-1">Reward</div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: isUnlocked ? rank.color : '#6b7280' }}
                        >
                          ${rank.rewardAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isUnlocked && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <span>✓</span>
                          <span>UNLOCKED</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connection Line */}
                  {index < allRanks.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gray-700 transform -translate-y-1/2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Achievement History */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Achievement History</h2>
            <p className="text-gray-400 text-sm">Your rank progression timeline</p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-purple-500"></div>

            {/* Timeline Items */}
            <div className="space-y-6">
              {achievementHistory.map((achievement, index) => {
                const rank = allRanks.find(r => r.id === achievement.rankId);
                if (!rank) return null;

                return (
                  <div key={achievement.rankId} className="relative pl-20">
                    {/* Timeline Node */}
                    <div
                      className="absolute left-0 w-16 h-16 rounded-full flex items-center justify-center border-4 border-gray-800"
                      style={{
                        background: `linear-gradient(135deg, ${rank.gradientFrom}, ${rank.gradientTo})`
                      }}
                    >
                      <span className="text-2xl">{rank.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3
                            className="text-xl font-bold mb-1"
                            style={{ color: rank.color }}
                          >
                            {rank.name} Rank Achieved
                          </h3>
                          <div className="text-gray-400 text-sm">
                            {new Date(achievement.achievedDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 text-2xl font-bold">
                            ${achievement.rewardClaimed.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-xs">Reward Claimed</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {rank.benefits.slice(0, 3).map((benefit, i) => (
                          <span
                            key={i}
                            className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700"
                          >
                            {benefit}
                          </span>
                        ))}
                        {rank.benefits.length > 3 && (
                          <span className="text-gray-500 text-xs px-3 py-1">
                            +{rank.benefits.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Achievement Preview */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">{nextRank.icon}</div>
            <div className="text-white font-bold text-lg mb-2">
              Next Achievement: {nextRank.name}
            </div>
            <div className="text-gray-300 text-sm mb-4">
              Unlock ${nextRank.rewardAmount.toLocaleString()} reward and exclusive benefits
            </div>
            <div className="text-purple-400 font-semibold">
              {overallProgress.toFixed(1)}% Progress • Est. {estimatedDaysToAchieve} days
            </div>
          </div>
        </Card>

        {/* Benefits Comparison Table */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Rank Benefits Comparison</h2>
            <p className="text-gray-400 text-sm">Compare features and benefits across all ranks</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-300 font-medium sticky left-0 bg-gray-800 z-10">
                    Benefit
                  </th>
                  {allRanks.map(rank => (
                    <th
                      key={rank.id}
                      className={`py-4 px-3 text-center min-w-[100px] ${
                        rank.id === currentRank.id ? 'bg-cyan-900/30' : ''
                      }`}
                    >
                      <div className="text-2xl mb-1">{rank.icon}</div>
                      <div
                        className="font-bold text-xs"
                        style={{ color: rank.id === currentRank.id ? '#22d3ee' : rank.color }}
                      >
                        {rank.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benefitCategories.map((category, index) => (
                  <tr key={category} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-3 px-4 text-gray-300 sticky left-0 bg-gray-800 z-10">
                      {category}
                    </td>
                    {allRanks.map(rank => (
                      <td
                        key={rank.id}
                        className={`py-3 px-3 text-center ${
                          rank.id === currentRank?.id ? 'bg-cyan-900/20' : ''
                        }`}
                      >
                        <span className={`${
                          rank.id === currentRank?.id ? 'text-cyan-400 font-bold' : 'text-gray-300'
                        }`}>
                          {benefitsMatrix[category][rank.id - 1]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-center text-gray-400 text-xs">
            Your current rank ({currentRank?.name || 'Loading...'}) is highlighted in cyan
          </div>
        </Card>

        {/* Rank Details Modal */}
        {selectedRankForDetails && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRankForDetails(null)}
          >
            <div
              className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="p-8 rounded-t-2xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedRankForDetails.gradientFrom}, ${selectedRankForDetails.gradientTo})`
                }}
              >
                <button
                  onClick={() => setSelectedRankForDetails(null)}
                  className="float-right text-white/80 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
                <div className="text-center">
                  <div className="text-7xl mb-4">{selectedRankForDetails.icon}</div>
                  <h2 className="text-4xl font-bold text-white mb-2">{selectedRankForDetails.name}</h2>
                  <div className="text-white/80 text-lg">Rank {selectedRankForDetails.id} of 10</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Requirements */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Requirements to Achieve</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Personal Investment</div>
                      <div className="text-white text-xl font-bold">
                        ${selectedRankForDetails.requirements.personalInvestment.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Team Volume</div>
                      <div className="text-white text-xl font-bold">
                        ${selectedRankForDetails.requirements.teamVolume.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Direct Referrals</div>
                      <div className="text-white text-xl font-bold">
                        {selectedRankForDetails.requirements.directReferrals}
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Active Team Members</div>
                      <div className="text-white text-xl font-bold">
                        {selectedRankForDetails.requirements.activeTeamMembers}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reward */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Achievement Reward</h3>
                  <div
                    className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 rounded-xl p-6 text-center"
                    style={{ borderColor: selectedRankForDetails.color }}
                  >
                    <div className="text-4xl mb-2">💰</div>
                    <div className="text-4xl font-bold text-white mb-2">
                      ${selectedRankForDetails.rewardAmount.toLocaleString()}
                    </div>
                    <div className="text-gray-300">One-time achievement bonus</div>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Benefits & Perks</h3>
                  <div className="space-y-2">
                    {selectedRankForDetails.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-gray-900 rounded-lg p-4"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: selectedRankForDetails.color }}
                        >
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div className="text-gray-300">{benefit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="text-center">
                  {selectedRankForDetails.unlocked ? (
                    <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                      <div className="text-green-400 font-bold text-lg">✓ Rank Unlocked</div>
                      <div className="text-gray-300 text-sm mt-1">You have achieved this rank</div>
                    </div>
                  ) : (
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                      <div className="text-gray-400 font-bold text-lg">🔒 Locked</div>
                      <div className="text-gray-500 text-sm mt-1">Complete the requirements to unlock</div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedRankForDetails(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RanksNew;
