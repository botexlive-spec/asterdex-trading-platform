/**
 * Plan Settings Service
 * Manages dynamic plan configuration and toggles
 */

import { query } from '../db';

export interface PlanSetting {
  id?: number;
  feature_key: string;
  feature_name: string;
  is_active: boolean;
  payload: any;
  description?: string;
}

export interface GenerationPlanConfig {
  level_percentages: number[];
  level_unlock_rules: Record<string, number>;
  distribution_type: 'roi_on_roi';
}

export interface InvestmentPlanConfig {
  base_amount: number;
  multiples_only: boolean;
  daily_roi_percentage: number;
  duration_days: number;
  max_investment_per_user: number;
}

export interface BoosterIncomeConfig {
  countdown_days: number;
  required_directs: number;
  bonus_roi_percentage: number;
  auto_disable_after_countdown: boolean;
}

export interface PrincipalWithdrawalConfig {
  deduction_before_30_days: number;
  deduction_after_30_days: number;
  minimum_withdrawal: number;
}

export interface MonthlyRewardsConfig {
  leg_ratio: number[];
  calculation_period: 'monthly';
  volume_reset: boolean;
}

/**
 * Get plan setting by feature key
 */
export async function getPlanSetting(feature_key: string): Promise<PlanSetting | null> {
  try {
    const result = await query(
      'SELECT * FROM plan_settings WHERE feature_key = ? LIMIT 1',
      [feature_key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const setting = result.rows[0];
    return {
      id: setting.id,
      feature_key: setting.feature_key,
      feature_name: setting.feature_name,
      is_active: Boolean(setting.is_active),
      payload: typeof setting.payload === 'string'
        ? JSON.parse(setting.payload)
        : setting.payload,
      description: setting.description
    };
  } catch (error) {
    console.error('Error getting plan setting:', error);
    throw error;
  }
}

/**
 * Get all plan settings
 */
export async function getAllPlanSettings(): Promise<PlanSetting[]> {
  try {
    const result = await query('SELECT * FROM plan_settings ORDER BY feature_key');

    return result.rows.map((row: any) => ({
      id: row.id,
      feature_key: row.feature_key,
      feature_name: row.feature_name,
      is_active: Boolean(row.is_active),
      payload: typeof row.payload === 'string'
        ? JSON.parse(row.payload)
        : row.payload,
      description: row.description
    }));
  } catch (error) {
    console.error('Error getting all plan settings:', error);
    throw error;
  }
}

/**
 * Update plan setting
 */
export async function updatePlanSetting(
  feature_key: string,
  updates: Partial<PlanSetting>
): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }

    if (updates.payload !== undefined) {
      fields.push('payload = ?');
      values.push(JSON.stringify(updates.payload));
    }

    if (updates.feature_name !== undefined) {
      fields.push('feature_name = ?');
      values.push(updates.feature_name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = NOW()');
    values.push(feature_key);

    await query(
      `UPDATE plan_settings SET ${fields.join(', ')} WHERE feature_key = ?`,
      values
    );
  } catch (error) {
    console.error('Error updating plan setting:', error);
    throw error;
  }
}

/**
 * Toggle plan active status
 */
export async function togglePlan(feature_key: string, is_active: boolean): Promise<void> {
  try {
    await query(
      'UPDATE plan_settings SET is_active = ?, updated_at = NOW() WHERE feature_key = ?',
      [is_active, feature_key]
    );
  } catch (error) {
    console.error('Error toggling plan:', error);
    throw error;
  }
}

/**
 * Check if plan is active
 */
export async function isPlanActive(feature_key: string): Promise<boolean> {
  try {
    const setting = await getPlanSetting(feature_key);
    return setting ? setting.is_active : false;
  } catch (error) {
    console.error('Error checking if plan is active:', error);
    return false;
  }
}

/**
 * Get generation plan configuration
 */
export async function getGenerationPlanConfig(): Promise<GenerationPlanConfig | null> {
  try {
    const setting = await getPlanSetting('generation_plan');
    return setting ? setting.payload as GenerationPlanConfig : null;
  } catch (error) {
    console.error('Error getting generation plan config:', error);
    return null;
  }
}

/**
 * Get investment plan configuration
 */
export async function getInvestmentPlanConfig(): Promise<InvestmentPlanConfig | null> {
  try {
    const setting = await getPlanSetting('investment_plan');
    return setting ? setting.payload as InvestmentPlanConfig : null;
  } catch (error) {
    console.error('Error getting investment plan config:', error);
    return null;
  }
}

/**
 * Get booster income configuration
 */
export async function getBoosterIncomeConfig(): Promise<BoosterIncomeConfig | null> {
  try {
    const setting = await getPlanSetting('booster_income');
    return setting ? setting.payload as BoosterIncomeConfig : null;
  } catch (error) {
    console.error('Error getting booster income config:', error);
    return null;
  }
}

/**
 * Get principal withdrawal configuration
 */
export async function getPrincipalWithdrawalConfig(): Promise<PrincipalWithdrawalConfig | null> {
  try {
    const setting = await getPlanSetting('principal_withdrawal');
    return setting ? setting.payload as PrincipalWithdrawalConfig : null;
  } catch (error) {
    console.error('Error getting principal withdrawal config:', error);
    return null;
  }
}

/**
 * Get monthly rewards configuration
 */
export async function getMonthlyRewardsConfig(): Promise<MonthlyRewardsConfig | null> {
  try {
    const setting = await getPlanSetting('monthly_rewards');
    return setting ? setting.payload as MonthlyRewardsConfig : null;
  } catch (error) {
    console.error('Error getting monthly rewards config:', error);
    return null;
  }
}

/**
 * Validate investment amount according to plan settings
 */
export async function validateInvestmentAmount(amount: number): Promise<{
  valid: boolean;
  message?: string;
}> {
  try {
    const config = await getInvestmentPlanConfig();

    if (!config) {
      return { valid: false, message: 'Investment plan configuration not found' };
    }

    if (config.multiples_only) {
      if (amount % config.base_amount !== 0) {
        return {
          valid: false,
          message: `Investment must be in multiples of $${config.base_amount}`
        };
      }
    }

    if (amount < config.base_amount) {
      return {
        valid: false,
        message: `Minimum investment is $${config.base_amount}`
      };
    }

    if (amount > config.max_investment_per_user) {
      return {
        valid: false,
        message: `Maximum investment is $${config.max_investment_per_user}`
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating investment amount:', error);
    return { valid: false, message: 'Validation error' };
  }
}
