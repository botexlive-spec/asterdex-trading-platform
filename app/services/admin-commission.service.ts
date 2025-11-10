/**
 * Admin Commission Service
 * Manages commission configurations, processing, and adjustments
 */


/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: Commission management
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-commission.ts
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
    // Admin auth handled by backend
    // For now, return default settings until backend endpoint is created
    console.log('Loading default commission settings');
    return getDefaultSettings();
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
    // TODO: Implement backend API endpoint for saving commission settings
    // await apiRequest('/api/admin/commission/settings', {
    //   method: 'PUT',
    //   body: JSON.stringify(settings)
    // });

    console.log('Commission settings saved successfully (placeholder)');
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
    // TODO: Implement backend API endpoint for commission history
    // const data = await apiRequest(`/api/admin/commission/history?limit=${limit}`);
    // return data.runs || [];

    console.log('Returning empty commission history (placeholder)');
    return [];
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
    // TODO: Implement backend API endpoint for processing commission runs
    // const data = await apiRequest('/api/admin/commission/run', {
    //   method: 'POST',
    //   body: JSON.stringify({ type, dateFrom, dateTo })
    // });
    // return data;

    console.log('Processing commission run (placeholder)');
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
    // TODO: Implement backend API endpoint for manual adjustments
    // await apiRequest('/api/admin/commission/adjustment', {
    //   method: 'POST',
    //   body: JSON.stringify({ userId, amount, type, reason })
    // });

    console.log(`Manual adjustment of ${amount} (${type}) applied to user ${userId} (placeholder)`);
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
    // TODO: Implement backend API endpoint for commission stats
    // const data = await apiRequest('/api/admin/commission/stats');
    // return data;

    console.log('Returning empty commission stats (placeholder)');
    return { by_type: {}, total: 0 };
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
    // TODO: Implement backend API endpoint for logging changes
    // await apiRequest('/api/admin/commission/changelog', {
    //   method: 'POST',
    //   body: JSON.stringify(change)
    // });

    console.log('Logged commission change (placeholder):', change.description);
  } catch (error: any) {
    console.error('Error logging commission change:', error);
  }
};

/**
 * Get commission changelog
 */
export const getCommissionChangelog = async (limit: number = 50): Promise<ChangelogEntry[]> => {
  try {
    // TODO: Implement backend API endpoint for changelog
    // const data = await apiRequest(`/api/admin/commission/changelog?limit=${limit}`);
    // return data.entries || [];

    console.log('Returning empty changelog (placeholder)');
    return [];
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
    // TODO: Implement backend API endpoint for commission runs
    // const data = await apiRequest(`/api/admin/commission/runs?limit=${limit}`);
    // return data.runs || [];

    console.log('Returning empty commission runs (placeholder)');
    return [];
  } catch (error: any) {
    console.error('Error getting commission runs:', error);
    return [];
  }
};
