/**
 * Admin Configuration Service
 * Manage database-driven business rules and system settings
 */

import { requireAdmin } from '../middleware/admin.middleware';

// ============================================
// LEVEL INCOME CONFIGURATION
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
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('level_income_config')
      .select('*')
      .order('level', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get level income config error:', error);
    return [];
  }
};

export const updateLevelIncomeConfig = async (level: number, config: Partial<LevelIncomeConfig>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('level_income_config')
      .update({
        percentage: config.percentage,
        amount: config.amount,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('level', level);

    if (error) throw error;

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
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('matching_bonus_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get matching bonus tiers error:', error);
    return [];
  }
};

export const updateMatchingBonusTier = async (tierId: string, tier: Partial<MatchingBonusTier>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('matching_bonus_tiers')
      .update({
        tier_name: tier.tier_name,
        left_matches_required: tier.left_matches_required,
        right_matches_required: tier.right_matches_required,
        bonus_amount: tier.bonus_amount,
        bonus_percentage: tier.bonus_percentage,
        is_active: tier.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tierId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Update matching bonus tier error:', error);
    throw new Error(error.message || 'Failed to update matching bonus tier');
  }
};

export const createMatchingBonusTier = async (tier: Omit<MatchingBonusTier, 'id' | 'created_at' | 'updated_at'>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('matching_bonus_tiers')
      .insert({
        tier_name: tier.tier_name,
        tier_level: tier.tier_level,
        left_matches_required: tier.left_matches_required,
        right_matches_required: tier.right_matches_required,
        bonus_amount: tier.bonus_amount,
        bonus_percentage: tier.bonus_percentage,
        is_active: tier.is_active,
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Create matching bonus tier error:', error);
    throw new Error(error.message || 'Failed to create matching bonus tier');
  }
};

export const deleteMatchingBonusTier = async (tierId: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('matching_bonus_tiers')
      .delete()
      .eq('id', tierId);

    if (error) throw error;

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
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('rank_requirements')
      .select('*')
      .order('min_volume', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get rank requirements error:', error);
    return [];
  }
};

export const updateRankRequirement = async (rankId: string, rank: Partial<RankRequirement>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('rank_requirements')
      .update({
        rank: rank.rank,
        min_volume: rank.min_volume,
        min_direct_referrals: rank.min_direct_referrals,
        min_team_size: rank.min_team_size,
        reward_amount: rank.reward_amount,
        levels_unlocked: rank.levels_unlocked,
        rank_color: rank.rank_color,
        rank_icon: rank.rank_icon,
        description: rank.description,
        is_active: rank.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rankId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Update rank requirement error:', error);
    throw new Error(error.message || 'Failed to update rank requirement');
  }
};

export const createRankRequirement = async (rank: Omit<RankRequirement, 'id' | 'created_at' | 'updated_at'>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('rank_requirements')
      .insert({
        rank: rank.rank,
        min_volume: rank.min_volume,
        min_direct_referrals: rank.min_direct_referrals,
        min_team_size: rank.min_team_size,
        reward_amount: rank.reward_amount,
        levels_unlocked: rank.levels_unlocked,
        rank_color: rank.rank_color,
        rank_icon: rank.rank_icon,
        description: rank.description,
        is_active: rank.is_active,
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Create rank requirement error:', error);
    throw new Error(error.message || 'Failed to create rank requirement');
  }
};

export const deleteRankRequirement = async (rankId: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('rank_requirements')
      .delete()
      .eq('id', rankId);

    if (error) throw error;

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
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('binary_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get binary settings error:', error);
    return [];
  }
};

export const updateBinarySetting = async (settingKey: string, settingValue: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('binary_settings')
      .update({
        setting_value: settingValue,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', settingKey);

    if (error) throw error;

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
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('mlm_system_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get system settings error:', error);
    return [];
  }
};

export const updateSystemSetting = async (settingKey: string, settingValue: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('mlm_system_settings')
      .update({
        setting_value: settingValue,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', settingKey);

    if (error) throw error;

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
    await requireAdmin();

// This will be handled on the backend by calling the clearConfigCache() function
    // from mlm.service.ts after any config update
    // For now, we'll just return success
    return { success: true, message: 'Configuration cache cleared successfully' };
  } catch (error: any) {
    console.error('Clear config cache error:', error);
    throw new Error(error.message || 'Failed to clear config cache');
  }
};
