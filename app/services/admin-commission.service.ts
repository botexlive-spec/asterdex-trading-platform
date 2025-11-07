/**
 * Admin Commission Service
 * Manages commission configurations, processing, and adjustments
 */

import { requireAdmin } from '../middleware/admin.middleware';

export interface LevelCommissionConfig {
  level: number;
  percentage: number;
  status: 'active' | 'inactive';
}

export interface BinarySettings {
  matchingPercentage: number;
  dailyCap: number;
  weeklyCap: number;
  monthlyCap: number;
  matchingRatio: string;
  flushPeriod: string;
}

export interface ROISettings {
  starterMin: number;
  starterMax: number;
  growthMin: number;
  growthMax: number;
  premiumMin: number;
  premiumMax: number;
  distributionSchedule: string;
}

export interface RankReward {
  rank: string;
  reward: number;
  requirement: string;
}

export interface BoosterSettings {
  percentage: number;
  conditions: string;
}

export interface CommissionSettings {
  level_commissions: LevelCommissionConfig[];
  binary_settings: BinarySettings;
  roi_settings: ROISettings;
  rank_rewards: RankReward[];
  booster_settings: BoosterSettings;
  active_levels?: number;
}

export interface ChangelogEntry {
  id: string;
  changed_by: string;
  change_type: string;
  section: string;
  old_value: any;
  new_value: any;
  description: string;
  affected_users: number;
  created_at: string;
}

export interface CommissionRun {
  id: string;
  type: string;
  date: string;
  affected_users: number;
  total_amount: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

/**
 * Get all commission settings
 */
export const getCommissionSettings = async (): Promise<CommissionSettings> => {
  try {
        // Verify admin access
    await requireAdmin();

// Try to get from database first
    const { data, error } = await supabase
      .from('commission_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.log('No commission settings found in database, returning defaults');
      return getDefaultSettings();
    }

    return {
      level_commissions: data.level_commissions || getDefaultSettings().level_commissions,
      binary_settings: data.binary_settings || getDefaultSettings().binary_settings,
      roi_settings: data.roi_settings || getDefaultSettings().roi_settings,
      rank_rewards: data.rank_rewards || getDefaultSettings().rank_rewards,
      booster_settings: data.booster_settings || getDefaultSettings().booster_settings,
      active_levels: data.active_levels || 30,
    };
  } catch (error: any) {
    console.error('Error getting commission settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Get default commission settings
 */
export const getDefaultSettings = (): CommissionSettings => {
  return {
    level_commissions: Array.from({ length: 30 }, (_, i) => ({
      level: i + 1,
      percentage: i < 5 ? 5 - i : i < 10 ? 2 : 1,
      status: 'active' as const,
    })),
    binary_settings: {
      matchingPercentage: 10,
      dailyCap: 1000,
      weeklyCap: 5000,
      monthlyCap: 20000,
      matchingRatio: '1:1',
      flushPeriod: 'weekly',
    },
    roi_settings: {
      starterMin: 5,
      starterMax: 7,
      growthMin: 7,
      growthMax: 10,
      premiumMin: 10,
      premiumMax: 15,
      distributionSchedule: 'daily',
    },
    rank_rewards: [
      { rank: 'Bronze', reward: 500, requirement: '5 directs' },
      { rank: 'Silver', reward: 1500, requirement: '10 directs + $5k team volume' },
      { rank: 'Gold', reward: 5000, requirement: '20 directs + $20k team volume' },
      { rank: 'Platinum', reward: 15000, requirement: '50 directs + $100k team volume' },
      { rank: 'Diamond', reward: 50000, requirement: '100 directs + $500k team volume' },
    ],
    booster_settings: {
      percentage: 5,
      conditions: '- Minimum 10 active directs\n- Team volume $50,000+\n- Active package required',
    },
  };
};

/**
 * Save commission settings
 */
export const saveCommissionSettings = async (settings: CommissionSettings): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

// Check if settings exist
    const { data: existing } = await supabase
      .from('commission_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('commission_settings')
        .update({
          level_commissions: settings.level_commissions,
          binary_settings: settings.binary_settings,
          roi_settings: settings.roi_settings,
          rank_rewards: settings.rank_rewards,
          booster_settings: settings.booster_settings,
          active_levels: settings.active_levels || 30,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('commission_settings')
        .insert([{
          level_commissions: settings.level_commissions,
          binary_settings: settings.binary_settings,
          roi_settings: settings.roi_settings,
          rank_rewards: settings.rank_rewards,
          booster_settings: settings.booster_settings,
          active_levels: settings.active_levels || 30,
        }]);

      if (error) throw error;
    }

    // Log the change to changelog
    await logCommissionChange({
      change_type: 'settings_update',
      section: 'all',
      new_value: settings,
      description: 'Commission settings updated',
    });

    console.log('Commission settings saved successfully');
  } catch (error: any) {
    console.error('Error saving commission settings:', error);
    throw new Error(error.message || 'Failed to save commission settings');
  }
};

/**
 * Get commission run history
 */
export const getCommissionHistory = async (limit: number = 100): Promise<CommissionRun[]> => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('commission_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('No commission runs found:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting commission history:', error);
    return [];
  }
};

/**
 * Process commission run
 */
export const processCommissionRun = async (
  type: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ affected_users: number; total_amount: number }> => {
  try {
    // This would typically call a backend API or database function
    // For now, we'll create a placeholder run record
    const { data, error } = await supabase
      .from('commission_runs')
      .insert([{
        type,
        date_from: dateFrom,
        date_to: dateTo,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    // In a real implementation, this would trigger the actual commission calculation
    // For now, return mock data
    return {
      affected_users: 0,
      total_amount: 0,
    };
  } catch (error: any) {
    console.error('Error processing commission run:', error);
    throw new Error(error.message || 'Failed to process commission run');
  }
};

/**
 * Manual commission adjustment
 */
export const manualCommissionAdjustment = async (
  userId: string,
  amount: number,
  type: 'add' | 'deduct',
  reason: string
): Promise<void> => {
  try {
        // Verify admin access
    await requireAdmin();

// Get user's current wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('available_balance, total_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      throw new Error('User wallet not found');
    }

    const adjustedAmount = type === 'add' ? amount : -amount;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('wallets')
      .update({
        available_balance: wallet.available_balance + adjustedAmount,
        total_balance: wallet.total_balance + adjustedAmount,
      })
      .eq('user_id', userId);

    if (walletError) throw walletError;

    // Create transaction record
    const { error: txError } = await supabase
      .from('mlm_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'manual_adjustment',
        amount: adjustedAmount,
        description: reason,
        status: 'completed',
      }]);

    if (txError) throw txError;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        action_type: 'commission_adjustment',
        target_id: userId,
        details: {
          amount: adjustedAmount,
          type,
          reason,
        },
      }]);

    console.log(`Manual adjustment of ${adjustedAmount} applied to user ${userId}`);
  } catch (error: any) {
    console.error('Error applying manual adjustment:', error);
    throw new Error(error.message || 'Failed to apply manual adjustment');
  }
};

/**
 * Get commission statistics
 */
export const getCommissionStats = async () => {
  try {
        // Verify admin access
    await requireAdmin();

// Get total commissions by type
    const { data: commissions } = await supabase
      .from('mlm_transactions')
      .select('transaction_type, amount')
      .in('transaction_type', [
        'direct_income',
        'level_income',
        'matching_bonus',
        'rank_reward',
        'booster_income',
        'roi_income',
      ]);

    const stats = {
      by_type: {} as Record<string, number>,
      total: 0,
    };

    commissions?.forEach((c: any) => {
      const type = c.transaction_type;
      const amount = Math.abs(c.amount);
      stats.by_type[type] = (stats.by_type[type] || 0) + amount;
      stats.total += amount;
    });

    return stats;
  } catch (error: any) {
    console.error('Error getting commission stats:', error);
    return { by_type: {}, total: 0 };
  }
};
// Add these functions to the end of app/services/admin-commission.service.ts

/**
 * Log a commission change to the changelog
 */
export const logCommissionChange = async (change: {
  change_type: string;
  section: string;
  old_value?: any;
  new_value?: any;
  description: string;
  affected_users?: number;
}): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('commission_changelog')
      .insert([{
        changed_by: user?.id,
        change_type: change.change_type,
        section: change.section,
        old_value: change.old_value,
        new_value: change.new_value,
        description: change.description,
        affected_users: change.affected_users || 0,
      }]);

    if (error) {
      console.error('Error logging change:', error);
    }
  } catch (error: any) {
    console.error('Error logging commission change:', error);
  }
};

/**
 * Get commission changelog
 */
export const getCommissionChangelog = async (limit: number = 50): Promise<ChangelogEntry[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('commission_changelog')
      .select(`
        *,
        user:changed_by(email, raw_user_meta_data)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error getting changelog:', error);
    return [];
  }
};

/**
 * Get commission runs
 */
export const getCommissionRuns = async (limit: number = 50): Promise<any[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('commission_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error getting commission runs:', error);
    return [];
  }
};
