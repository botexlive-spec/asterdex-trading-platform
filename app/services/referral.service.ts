/**
 * Referral Service
 * Handles all referral marketing-related API calls
 */


import {
  ReferralCode,
  Referral,
  ReferralStats,
  ReferralDashboardData,
  CreateReferralCodeData,
  UpdateReferralCodeData,
  TradingActivity,
  LeaderboardEntry,
} from '../types/referral.types';

/**
 * Get user's referral codes
 */
export const getUserReferralCodes = async (): Promise<ReferralCode[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as ReferralCode[];
  } catch (error: any) {
    console.error('Get referral codes error:', error);
    throw new Error(error.message || 'Failed to fetch referral codes');
  }
};

/**
 * Create a new referral code
 */
export const createReferralCode = async (data: CreateReferralCodeData = {}): Promise<ReferralCode> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Call the database function to generate a unique code
    const { data: codeData, error } = await supabase
      .from('referral_codes')
      .insert({
        user_id: user.id,
        expires_at: data.expires_at,
      })
      .select()
      .single();

    if (error) throw error;

    return codeData as ReferralCode;
  } catch (error: any) {
    console.error('Create referral code error:', error);
    throw new Error(error.message || 'Failed to create referral code');
  }
};

/**
 * Update a referral code
 */
export const updateReferralCode = async (
  codeId: string,
  data: UpdateReferralCodeData
): Promise<ReferralCode> => {
  try {
    const { data: codeData, error } = await supabase
      .from('referral_codes')
      .update(data)
      .eq('id', codeId)
      .select()
      .single();

    if (error) throw error;

    return codeData as ReferralCode;
  } catch (error: any) {
    console.error('Update referral code error:', error);
    throw new Error(error.message || 'Failed to update referral code');
  }
};

/**
 * Track a referral click
 */
export const trackReferralClick = async (code: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('increment_referral_clicks', {
      referral_code: code,
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Track referral click error:', error);
    // Don't throw error for click tracking failures
  }
};

/**
 * Get user's referrals
 */
export const getUserReferrals = async (): Promise<Referral[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as Referral[];
  } catch (error: any) {
    console.error('Get referrals error:', error);
    throw new Error(error.message || 'Failed to fetch referrals');
  }
};

/**
 * Get referral stats for current user
 */
export const getReferralStats = async (): Promise<ReferralStats> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get referral codes stats
    const { data: codes } = await supabase
      .from('referral_codes')
      .select('clicks, signups')
      .eq('user_id', user.id);

    // Get referrals stats
    const { data: referrals } = await supabase
      .from('referrals')
      .select('status, commission_earned')
      .eq('referrer_id', user.id);

    const total_clicks = codes?.reduce((sum, code) => sum + code.clicks, 0) || 0;
    const total_signups = codes?.reduce((sum, code) => sum + code.signups, 0) || 0;
    const total_referrals = referrals?.length || 0;
    const active_referrals = referrals?.filter(r => r.status === 'active').length || 0;
    const total_commission = referrals?.reduce((sum, r) => sum + parseFloat(r.commission_earned.toString()), 0) || 0;
    const conversion_rate = total_clicks > 0 ? (total_signups / total_clicks) * 100 : 0;

    return {
      total_referrals,
      active_referrals,
      total_clicks,
      total_signups,
      total_commission,
      conversion_rate,
    };
  } catch (error: any) {
    console.error('Get referral stats error:', error);
    throw new Error(error.message || 'Failed to fetch referral stats');
  }
};

/**
 * Get complete referral dashboard data
 */
export const getReferralDashboard = async (): Promise<ReferralDashboardData> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Fetch referral codes
    const codes = await getUserReferralCodes();

    // Fetch referrals
    const referrals = await getUserReferrals();

    // Fetch stats
    const stats = await getReferralStats();

    // Fetch recent trading activity
    const { data: activityData, error: activityError } = await supabase
      .from('trading_activity')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) throw activityError;

    return {
      user: userData,
      codes,
      referrals,
      stats,
      recent_activity: activityData as TradingActivity[],
    };
  } catch (error: any) {
    console.error('Get referral dashboard error:', error);
    throw new Error(error.message || 'Failed to fetch referral dashboard');
  }
};

/**
 * Get referral leaderboard
 */
export const getReferralLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const { data, error } = await supabase.rpc('get_referral_leaderboard', {
      result_limit: limit,
    });

    if (error) throw error;

    return data as LeaderboardEntry[];
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    // Return empty array if function doesn't exist yet
    return [];
  }
};

/**
 * Validate referral code
 */
export const validateReferralCode = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('id, is_active, expires_at')
      .eq('code', code)
      .single();

    if (error || !data) return false;

    // Check if code is active
    if (!data.is_active) return false;

    // Check if code is expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) return false;
    }

    return true;
  } catch (error: any) {
    console.error('Validate referral code error:', error);
    return false;
  }
};

/**
 * Record a trade for commission tracking
 */
export const recordTrade = async (tradeData: {
  trade_volume: number;
  commission: number;
  trade_data?: Record<string, any>;
}): Promise<TradingActivity> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('trading_activity')
      .insert({
        user_id: user.id,
        ...tradeData,
      })
      .select()
      .single();

    if (error) throw error;

    return data as TradingActivity;
  } catch (error: any) {
    console.error('Record trade error:', error);
    throw new Error(error.message || 'Failed to record trade');
  }
};
