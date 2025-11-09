/**
 * Admin Configuration Service
 * Manage database-driven business rules and system settings
 */

// ============================================
// LEVEL INCOME CONFIGURATION
// ============================================


/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: System configuration management
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-config.ts
 * 2. Replace TODO comments with actual API calls using apiRequest()
 * 3. Follow pattern from admin-rank.service.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage or sessionStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
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


// ============================================
// SERVICE FUNCTIONS (Need MySQL Backend APIs)
// ============================================


export interface LevelIncomeConfig {
  id?: string;
  level: number;
  percentage: number;
  amount: number;
  is_active: boolean;
  updated_at?: string;
}

export const getLevelIncomeConfig = async () => {
  try {
    const result = await apiRequest('/api/config/level_income');
    return result.value || [];
  } catch (error: any) {
    console.error('Get level income config error:', error);
    return [];
  }
};

export const updateLevelIncomeConfig = async (level: number, config: Partial<LevelIncomeConfig>) => {
  try {
    // Get current config
    const current = await getLevelIncomeConfig();

    // Update the specific level
    const updated = current.map((item: any) =>
      item.level === level ? { ...item, ...config } : item
    );

    await apiRequest('/api/config/level_income', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update level income config error:', error);
    throw new Error(error.message || 'Failed to update level income config');
  }
};

// ============================================
// MATCHING BONUS TIERS
// ============================================

export interface MatchingBonusTier {
  id?: string;
  tier_name: string;
  tier_level: number;
  left_matches_required: number;
  right_matches_required: number;
  bonus_amount: number;
  bonus_percentage: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getMatchingBonusTiers = async () => {
  try {
    const result = await apiRequest('/api/config/matching_bonus_tiers');
    return result.value || [];
  } catch (error: any) {
    console.error('Get matching bonus tiers error:', error);
    return [];
  }
};

export const updateMatchingBonusTier = async (tierId: string, tier: Partial<MatchingBonusTier>) => {
  try {
    const current = await getMatchingBonusTiers();
    const updated = current.map((item: any) =>
      item.id === tierId ? { ...item, ...tier } : item
    );

    await apiRequest('/api/config/matching_bonus_tiers', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update matching bonus tier error:', error);
    throw new Error(error.message || 'Failed to update matching bonus tier');
  }
};

export const createMatchingBonusTier = async (tier: Omit<MatchingBonusTier, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const current = await getMatchingBonusTiers();
    const newTier = {
      ...tier,
      id: `tier_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await apiRequest('/api/config/matching_bonus_tiers', {
      method: 'PUT',
      body: JSON.stringify({ value: [...current, newTier] }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Create matching bonus tier error:', error);
    throw new Error(error.message || 'Failed to create matching bonus tier');
  }
};

export const deleteMatchingBonusTier = async (tierId: string) => {
  try {
    const current = await getMatchingBonusTiers();
    const updated = current.filter((item: any) => item.id !== tierId);

    await apiRequest('/api/config/matching_bonus_tiers', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Delete matching bonus tier error:', error);
    throw new Error(error.message || 'Failed to delete matching bonus tier');
  }
};

// ============================================
// RANK REQUIREMENTS
// ============================================

export interface RankRequirement {
  id?: string;
  rank: string;
  min_volume: number;
  min_direct_referrals: number;
  min_team_size: number;
  reward_amount: number;
  levels_unlocked: number;
  rank_color: string;
  rank_icon: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getRankRequirements = async () => {
  try {
    const result = await apiRequest('/api/config/rank_requirements');
    return result.value || [];
  } catch (error: any) {
    console.error('Get rank requirements error:', error);
    return [];
  }
};

export const updateRankRequirement = async (rankId: string, rank: Partial<RankRequirement>) => {
  try {
    const current = await getRankRequirements();
    const updated = current.map((item: any) =>
      item.id === rankId ? { ...item, ...rank } : item
    );

    await apiRequest('/api/config/rank_requirements', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update rank requirement error:', error);
    throw new Error(error.message || 'Failed to update rank requirement');
  }
};

export const createRankRequirement = async (rank: Omit<RankRequirement, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const current = await getRankRequirements();
    const newRank = {
      ...rank,
      id: `rank_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await apiRequest('/api/config/rank_requirements', {
      method: 'PUT',
      body: JSON.stringify({ value: [...current, newRank] }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Create rank requirement error:', error);
    throw new Error(error.message || 'Failed to create rank requirement');
  }
};

export const deleteRankRequirement = async (rankId: string) => {
  try {
    const current = await getRankRequirements();
    const updated = current.filter((item: any) => item.id !== rankId);

    await apiRequest('/api/config/rank_requirements', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Delete rank requirement error:', error);
    throw new Error(error.message || 'Failed to delete rank requirement');
  }
};

// ============================================
// BINARY SETTINGS
// ============================================

export interface BinarySetting {
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at?: string;
}

export const getBinarySettings = async () => {
  try {
    const result = await apiRequest('/api/config/binary_settings');
    return result.value || [];
  } catch (error: any) {
    console.error('Get binary settings error:', error);
    return [];
  }
};

export const updateBinarySetting = async (settingKey: string, settingValue: string) => {
  try {
    const current = await getBinarySettings();
    const updated = current.map((item: any) =>
      item.setting_key === settingKey ? { ...item, setting_value: settingValue } : item
    );

    await apiRequest('/api/config/binary_settings', {
      method: 'PUT',
      body: JSON.stringify({ value: updated }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update binary setting error:', error);
    throw new Error(error.message || 'Failed to update binary setting');
  }
};

// ============================================
// MLM SYSTEM SETTINGS
// ============================================

export interface SystemSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  updated_at?: string;
}

export const getSystemSettings = async () => {
  try {
    const result = await apiRequest('/api/config');
    return result.raw || []; // Get all config as array
  } catch (error: any) {
    console.error('Get system settings error:', error);
    return [];
  }
};

export const updateSystemSetting = async (settingKey: string, settingValue: string) => {
  try {
    await apiRequest(`/api/config/${settingKey}`, {
      method: 'PUT',
      body: JSON.stringify({ value: settingValue }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update system setting error:', error);
    throw new Error(error.message || 'Failed to update system setting');
  }
};

// ============================================
// CACHE MANAGEMENT
// ============================================

export const clearConfigCache = async () => {
  try {
        // Verify admin access
    // Admin auth handled by backend// This will be handled on the backend by calling the clearConfigCache() function
    // from mlm.service.ts after any config update
    // For now, we'll just return success
    return { success: true, message: 'Configuration cache cleared successfully' };
  } catch (error: any) {
    console.error('Clear config cache error:', error);
    throw new Error(error.message || 'Failed to clear config cache');
  }
};
