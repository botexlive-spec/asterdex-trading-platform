/**
 * Admin Rank Rewards Service - MySQL Backend
 * Manages rank reward configurations and distributions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all rank rewards
 */
export const getAllRankRewards = async (): Promise<RankReward[]> => {
  try {
    const result = await apiRequest('/api/ranks');
    return result.data || [];
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
    await apiRequest(`/api/ranks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

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
    const result = await apiRequest('/api/ranks', {
      method: 'POST',
      body: JSON.stringify(rankData),
    });

    console.log(`Rank reward ${result.data.rank_name} created successfully`);
    return result.data;
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
    await apiRequest(`/api/ranks/${id}`, {
      method: 'DELETE',
    });

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
    const result = await apiRequest(`/api/ranks/distributions?limit=${limit}`);
    return result.data || [];
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
    await apiRequest('/api/ranks/distribute', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        rankName,
        rewardAmount,
        distributionType,
        notes,
      }),
    });

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
    const result = await apiRequest(`/api/ranks/qualification/${userId}/${rankId}`);
    return result;
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
    const endpoint = userId ? `/api/ranks/achievements/${userId}` : '/api/ranks/achievements';
    const result = await apiRequest(endpoint);
    return result.data || [];
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
    await apiRequest(`/api/ranks/user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        rankId: newRankId,
        reason,
      }),
    });

    console.log(`User ${userId} rank updated successfully`);
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
    const result = await apiRequest('/api/ranks/stats');
    return result;
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
    const result = await apiRequest(`/api/ranks/eligibility/${userId}`);
    return result;
  } catch (error: any) {
    console.error('Error calculating rank eligibility:', error);
    return {
      currentRank: null,
      eligibleRanks: [],
    };
  }
};

// Note: requireAdmin middleware is now handled on the backend
// All routes in server/routes/ranks.ts are protected by authenticateAdmin middleware
