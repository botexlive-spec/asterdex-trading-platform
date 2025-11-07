/**
 * Admin Rank Rewards Service
 * Manages rank reward configurations and distributions
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface RankReward {
  id?: string;
  rank_name: string;
  reward_amount: number;
  rank_order: number;
  min_direct_referrals: number;
  min_team_volume: number;
  min_active_directs: number;
  min_personal_sales: number;
  terms_conditions: string;
  is_active: boolean;
  reward_type: 'one_time' | 'monthly' | 'quarterly';
  bonus_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface RankDistribution {
  id: string;
  user_id: string;
  rank_name: string;
  reward_amount: number;
  distributed_by: string;
  distribution_type: 'automatic' | 'manual';
  notes: string;
  created_at: string;
}

/**
 * Get all rank rewards
 */
export const getAllRankRewards = async (): Promise<RankReward[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('rank_rewards')
      .select('*')
      .order('rank_order', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error getting rank rewards:', error);
    throw new Error(`Failed to fetch rank rewards: ${error.message}`);
  }
};

/**
 * Update rank reward
 */
export const updateRankReward = async (id: string, updates: Partial<RankReward>): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('rank_rewards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    console.log(`Rank reward ${id} updated successfully`);
  } catch (error: any) {
    console.error('Error updating rank reward:', error);
    throw new Error(`Failed to update rank reward: ${error.message}`);
  }
};

/**
 * Create new rank reward
 */
export const createRankReward = async (rankData: Omit<RankReward, 'id' | 'created_at' | 'updated_at'>): Promise<RankReward> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('rank_rewards')
      .insert([rankData])
      .select()
      .single();

    if (error) throw error;

    console.log(`Rank reward ${data.rank_name} created successfully`);
    return data;
  } catch (error: any) {
    console.error('Error creating rank reward:', error);
    throw new Error(`Failed to create rank reward: ${error.message}`);
  }
};

/**
 * Delete rank reward
 */
export const deleteRankReward = async (id: string): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('rank_rewards')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`Rank reward ${id} deleted successfully`);
  } catch (error: any) {
    console.error('Error deleting rank reward:', error);
    throw new Error(`Failed to delete rank reward: ${error.message}`);
  }
};

/**
 * Get rank distribution history
 */
export const getRankDistributionHistory = async (limit: number = 100): Promise<RankDistribution[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('rank_distribution_history')
      .select(`
        *,
        user:user_id(email, raw_user_meta_data),
        distributor:distributed_by(email, raw_user_meta_data)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error getting rank distribution history:', error);
    return [];
  }
};

/**
 * Distribute rank reward to user
 */
export const distributeRankReward = async (
  userId: string,
  rankName: string,
  rewardAmount: number,
  distributionType: 'automatic' | 'manual',
  notes: string = ''
): Promise<void> => {
  try {
    await requireAdmin();

    const { data: { user } } = await supabase.auth.getUser();

    // Create distribution record
    const { error: distError } = await supabase
      .from('rank_distribution_history')
      .insert([{
        user_id: userId,
        rank_name: rankName,
        reward_amount: rewardAmount,
        distributed_by: user?.id,
        distribution_type: distributionType,
        notes,
      }]);

    if (distError) throw distError;

    // Update user's wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('available_balance, total_balance')
      .eq('user_id', userId)
      .single();

    if (wallet) {
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          available_balance: wallet.available_balance + rewardAmount,
          total_balance: wallet.total_balance + rewardAmount,
        })
        .eq('user_id', userId);

      if (walletError) throw walletError;
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from('mlm_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'rank_reward',
        amount: rewardAmount,
        description: `${rankName} rank achievement reward`,
        status: 'completed',
      }]);

    if (txError) throw txError;

    console.log(`Rank reward of ${rewardAmount} distributed to user ${userId}`);
  } catch (error: any) {
    console.error('Error distributing rank reward:', error);
    throw new Error(`Failed to distribute rank reward: ${error.message}`);
  }
};

/**
 * Check if user qualifies for a rank
 */
export const checkUserRankQualification = async (userId: string, rankId: string): Promise<{
  qualified: boolean;
  missingRequirements: string[];
}> => {
  try {
    await requireAdmin();

    // Get rank requirements
    const { data: rank, error: rankError } = await supabase
      .from('rank_rewards')
      .select('*')
      .eq('id', rankId)
      .single();

    if (rankError || !rank) throw new Error('Rank not found');

    const missingRequirements: string[] = [];

    // Get user's referral statistics
    const { data: referrals } = await supabase
      .from('users')
      .select('id, raw_user_meta_data')
      .eq('referred_by', userId);

    const directReferrals = referrals?.length || 0;

    // Count active directs (users with active packages)
    const { data: activePackages } = await supabase
      .from('user_packages')
      .select('user_id')
      .in('user_id', referrals?.map(r => r.id) || [])
      .eq('status', 'active');

    const activeDirects = new Set(activePackages?.map(p => p.user_id) || []).size;

    // Calculate team volume (simplified - sum of all downline purchases)
    const { data: teamPurchases } = await supabase
      .from('user_packages')
      .select('price')
      .in('user_id', referrals?.map(r => r.id) || []);

    const teamVolume = teamPurchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

    // Calculate personal sales
    const { data: personalPurchases } = await supabase
      .from('user_packages')
      .select('price')
      .eq('user_id', userId);

    const personalSales = personalPurchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

    // Check requirements
    if (directReferrals < rank.min_direct_referrals) {
      missingRequirements.push(`Need ${rank.min_direct_referrals - directReferrals} more direct referrals`);
    }

    if (activeDirects < rank.min_active_directs) {
      missingRequirements.push(`Need ${rank.min_active_directs - activeDirects} more active direct referrals`);
    }

    if (teamVolume < rank.min_team_volume) {
      missingRequirements.push(`Need $${(rank.min_team_volume - teamVolume).toFixed(2)} more team volume`);
    }

    if (personalSales < rank.min_personal_sales) {
      missingRequirements.push(`Need $${(rank.min_personal_sales - personalSales).toFixed(2)} more personal sales`);
    }

    return {
      qualified: missingRequirements.length === 0,
      missingRequirements,
    };
  } catch (error: any) {
    console.error('Error checking rank qualification:', error);
    throw new Error(`Failed to check rank qualification: ${error.message}`);
  }
};

/**
 * Get user's current rank achievements
 */
export const getUserRankAchievements = async (userId?: string): Promise<RankDistribution[]> => {
  try {
    let query = supabase
      .from('rank_distribution_history')
      .select(`
        *,
        user:user_id(email, raw_user_meta_data)
      `)
      .order('created_at', { ascending: false });

    // If userId provided, filter by that user, otherwise get all
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error getting user rank achievements:', error);
    return [];
  }
};

/**
 * Alias for getAllRankRewards to maintain compatibility
 */
export const getAllRanks = getAllRankRewards;

/**
 * Update user's rank
 */
export const updateUserRank = async (
  userId: string,
  newRankId: string,
  reason: string = 'Manual adjustment'
): Promise<void> => {
  try {
    await requireAdmin();

    // Get rank details
    const { data: rank, error: rankError } = await supabase
      .from('rank_rewards')
      .select('*')
      .eq('id', newRankId)
      .single();

    if (rankError || !rank) throw new Error('Rank not found');

    // Distribute the rank reward
    await distributeRankReward(
      userId,
      rank.rank_name,
      rank.reward_amount,
      'manual',
      reason
    );

    console.log(`User ${userId} rank updated to ${rank.rank_name}`);
  } catch (error: any) {
    console.error('Error updating user rank:', error);
    throw new Error(`Failed to update user rank: ${error.message}`);
  }
};

/**
 * Get rank statistics
 */
export const getRankStats = async (): Promise<{
  totalAchievements: number;
  totalRewardsDistributed: number;
  achievementsByRank: Record<string, number>;
  recentAchievements: RankDistribution[];
}> => {
  try {
    await requireAdmin();

    // Get all distribution history
    const { data: distributions, error } = await supabase
      .from('rank_distribution_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalAchievements = distributions?.length || 0;
    const totalRewardsDistributed = distributions?.reduce((sum, d) => sum + parseFloat(d.reward_amount), 0) || 0;

    // Count achievements by rank
    const achievementsByRank: Record<string, number> = {};
    distributions?.forEach(d => {
      achievementsByRank[d.rank_name] = (achievementsByRank[d.rank_name] || 0) + 1;
    });

    // Get recent achievements
    const recentAchievements = distributions?.slice(0, 10) || [];

    return {
      totalAchievements,
      totalRewardsDistributed,
      achievementsByRank,
      recentAchievements,
    };
  } catch (error: any) {
    console.error('Error getting rank stats:', error);
    return {
      totalAchievements: 0,
      totalRewardsDistributed: 0,
      achievementsByRank: {},
      recentAchievements: [],
    };
  }
};

/**
 * Calculate rank eligibility for a user
 */
export const calculateRankEligibility = async (userId: string): Promise<{
  currentRank: string | null;
  eligibleRanks: Array<{
    rank: RankReward;
    qualified: boolean;
    progress: number;
    missingRequirements: string[];
  }>;
}> => {
  try {
    // Get all ranks
    const ranks = await getAllRankRewards();

    // Get user's current achievements
    const achievements = await getUserRankAchievements(userId);
    const currentRank = achievements.length > 0 ? achievements[0].rank_name : null;

    // Check eligibility for each rank
    const eligibleRanks = await Promise.all(
      ranks.map(async (rank) => {
        const qualification = await checkUserRankQualification(userId, rank.id!);

        // Calculate progress percentage
        const { data: referrals } = await supabase
          .from('users')
          .select('id')
          .eq('referred_by', userId);

        const directReferrals = referrals?.length || 0;

        const { data: activePackages } = await supabase
          .from('user_packages')
          .select('user_id')
          .in('user_id', referrals?.map(r => r.id) || [])
          .eq('status', 'active');

        const activeDirects = new Set(activePackages?.map(p => p.user_id) || []).size;

        const { data: teamPurchases } = await supabase
          .from('user_packages')
          .select('price')
          .in('user_id', referrals?.map(r => r.id) || []);

        const teamVolume = teamPurchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

        const { data: personalPurchases } = await supabase
          .from('user_packages')
          .select('price')
          .eq('user_id', userId);

        const personalSales = personalPurchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

        // Calculate average progress
        const referralProgress = Math.min((directReferrals / rank.min_direct_referrals) * 100, 100);
        const activeProgress = Math.min((activeDirects / rank.min_active_directs) * 100, 100);
        const volumeProgress = Math.min((teamVolume / rank.min_team_volume) * 100, 100);
        const salesProgress = Math.min((personalSales / rank.min_personal_sales) * 100, 100);

        const progress = (referralProgress + activeProgress + volumeProgress + salesProgress) / 4;

        return {
          rank,
          qualified: qualification.qualified,
          progress: Math.round(progress),
          missingRequirements: qualification.missingRequirements,
        };
      })
    );

    return {
      currentRank,
      eligibleRanks,
    };
  } catch (error: any) {
    console.error('Error calculating rank eligibility:', error);
    return {
      currentRank: null,
      eligibleRanks: [],
    };
  }
};
