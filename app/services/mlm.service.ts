/**
 * MLM Service
 * Core MLM Business Logic and Calculations
 */


import {
  Package,
  UserPackage,
  RobotSubscription,
  MLMTransaction,
  BinaryTreeNode,
  UserDashboardData,
  PurchasePackageData,
  // LEVEL_INCOME_CONFIG, // Migrated to database: level_income_config table
  // MATCHING_BONUS_TIERS, // Migrated to database: matching_bonus_tiers table
  // RANK_REQUIREMENTS, // Migrated to database: rank_requirements table
} from '../types/mlm.types';

// ============================================
// DATABASE-DRIVEN CONFIGURATION LOADERS
// ============================================

/**
 * Get level income configuration from database
 * Cached for performance
 */
let levelIncomeConfigCache: Array<{ level: number; percentage: number; amount: number }> | null = null;

export const getLevelIncomeConfig = async () => {
  if (levelIncomeConfigCache) return levelIncomeConfigCache;

  const { data, error } = await supabase
    .from('level_income_config')
    .select('level, percentage, fixed_amount')
    .eq('is_active', true)
    .order('level');

  if (error) {
    console.error('Error loading level income config:', error);
    return [];
  }

  // Convert to format matching old LEVEL_INCOME_CONFIG
  levelIncomeConfigCache = data?.map(item => ({
    level: item.level,
    percentage: item.percentage,
    amount: item.fixed_amount || 0
  })) || [];

  return levelIncomeConfigCache;
};

/**
 * Get matching bonus tiers from database
 */
let matchingBonusTiersCache: Array<{
  tierName: string;
  leftMatches: number;
  rightMatches: number;
  bonusAmount: number;
}> | null = null;

export const getMatchingBonusTiers = async () => {
  if (matchingBonusTiersCache) return matchingBonusTiersCache;

  const { data, error } = await supabase
    .from('matching_bonus_tiers')
    .select('tier_name, left_volume_required, right_volume_required, bonus_amount')
    .eq('is_active', true)
    .order('tier_order');

  if (error) {
    console.error('Error loading matching bonus tiers:', error);
    return [];
  }

  // Convert to format matching old MATCHING_BONUS_TIERS
  matchingBonusTiersCache = data?.map(item => ({
    tierName: item.tier_name,
    leftMatches: item.left_volume_required,
    rightMatches: item.right_volume_required,
    bonusAmount: item.bonus_amount
  })) || [];

  return matchingBonusTiersCache;
};

/**
 * Get rank requirements from database
 */
let rankRequirementsCache: Array<{
  rank: string;
  min_volume: number;
  reward_amount: number;
  levels_unlocked: number;
}> | null = null;

export const getRankRequirements = async () => {
  if (rankRequirementsCache) return rankRequirementsCache;

  const { data, error } = await supabase
    .from('rank_requirements')
    .select('rank_name, min_total_volume, reward_amount, levels_unlocked')
    .eq('is_active', true)
    .order('rank_level');

  if (error) {
    console.error('Error loading rank requirements:', error);
    console.log('⚠️  Using fallback rank requirements');

    // Fallback rank requirements (if table doesn't exist)
    return [
      { rank: 'starter', min_volume: 0, reward_amount: 0, levels_unlocked: 1 },
      { rank: 'bronze', min_volume: 10000, reward_amount: 500, levels_unlocked: 5 },
      { rank: 'silver', min_volume: 50000, reward_amount: 2500, levels_unlocked: 10 },
      { rank: 'gold', min_volume: 150000, reward_amount: 10000, levels_unlocked: 15 },
      { rank: 'platinum', min_volume: 500000, reward_amount: 50000, levels_unlocked: 30 }
    ];
  }

  // Convert to format matching old RANK_REQUIREMENTS
  rankRequirementsCache = data?.map(item => ({
    rank: item.rank_name.toLowerCase(),
    min_volume: item.min_total_volume,
    reward_amount: item.reward_amount,
    levels_unlocked: item.levels_unlocked
  })) || [];

  return rankRequirementsCache;
};

/**
 * Clear configuration caches (call when admin updates config)
 */
export const clearConfigCache = () => {
  levelIncomeConfigCache = null;
  matchingBonusTiersCache = null;
  rankRequirementsCache = null;
};

// ============================================
// ROBOT SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get user's robot subscription
 */
export const getUserRobotSubscription = async (userId?: string): Promise<RobotSubscription | null> => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return null;

    const { data, error } = await supabase
      .from('robot_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as RobotSubscription;
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has active robot subscription
 */
export const hasActiveRobotSubscription = async (userId?: string): Promise<boolean> => {
  try {
    const subscription = await getUserRobotSubscription(userId);
    return !!subscription;
  } catch (error) {
    return false;
  }
};

/**
 * Purchase robot subscription
 */
export const purchaseRobotSubscription = async (): Promise<RobotSubscription> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get subscription price from settings
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'robot_subscription_price')
      .single();

    const amount = parseFloat(settingData?.setting_value || '100');

    // Check user balance
    const { data: userData } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (!userData || userData.wallet_balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create subscription
    const { data: subscription, error } = await supabase
      .from('robot_subscriptions')
      .insert({
        user_id: user.id,
        amount,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Deduct from wallet
    await supabase
      .from('users')
      .update({
        wallet_balance: userData.wallet_balance - amount,
        robot_subscription_active: true,
        robot_subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id);

    // Create transaction record
    await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'robot_subscription',
        amount,
        status: 'completed',
        description: 'Robot subscription purchase',
      });

    return subscription as RobotSubscription;
  } catch (error: any) {
    console.error('Purchase robot subscription error:', error);
    throw new Error(error.message || 'Failed to purchase robot subscription');
  }
};

// ============================================
// PACKAGE MANAGEMENT
// ============================================

/**
 * Get all available packages
 */
export const getPackages = async (): Promise<Package[]> => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });

    if (error) throw error;
    return data as Package[];
  } catch (error: any) {
    console.error('Get packages error:', error);
    throw new Error(error.message || 'Failed to fetch packages');
  }
};

/**
 * Get user's active packages
 */
export const getUserPackages = async (userId?: string): Promise<UserPackage[]> => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    // Query user_packages without join (packages table FK may not exist)
    const { data, error } = await supabase
      .from('user_packages')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Loaded ${data?.length || 0} active packages for user`);
    return data as UserPackage[];
  } catch (error: any) {
    console.error('Get user packages error:', error);
    throw new Error(error.message || 'Failed to fetch user packages');
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (packageData: PurchasePackageData): Promise<UserPackage> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Check robot subscription
    const hasRobot = await hasActiveRobotSubscription(user.id);
    if (!hasRobot) {
      throw new Error('Active robot subscription required to purchase packages');
    }

    // Get package details
    const { data: packageInfo, error: pkgError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageData.package_id)
      .single();

    if (pkgError || !packageInfo) throw new Error('Package not found');

    // Validate amount
    if (packageData.amount < packageInfo.min_amount) {
      throw new Error(`Minimum amount is $${packageInfo.min_amount}`);
    }

    if (packageInfo.max_amount && packageData.amount > packageInfo.max_amount) {
      throw new Error(`Maximum amount is $${packageInfo.max_amount}`);
    }

    // Check user balance
    const { data: userData } = await supabase
      .from('users')
      .select('wallet_balance, sponsor_id, total_investment')
      .eq('id', user.id)
      .single();

    if (!userData || userData.wallet_balance < packageData.amount) {
      throw new Error('Insufficient balance');
    }

    // Calculate ROI percentage based on amount
    let roiPercentage = packageInfo.roi_percentage_min;
    const range = packageInfo.roi_percentage_max - packageInfo.roi_percentage_min;
    const amountRange = (packageInfo.max_amount || packageData.amount) - packageInfo.min_amount;
    const amountPosition = packageData.amount - packageInfo.min_amount;
    roiPercentage += (range * amountPosition) / amountRange;

    // Create user package
    const { data: userPackage, error: upError } = await supabase
      .from('user_packages')
      .insert({
        user_id: user.id,
        package_id: packageData.package_id,
        amount: packageData.amount,
        roi_percentage: roiPercentage,
        is_active: true,
      })
      .select()
      .single();

    if (upError) throw upError;

    // Update user's investment and balance
    await supabase
      .from('users')
      .update({
        wallet_balance: userData.wallet_balance - packageData.amount,
        total_investment: userData.total_investment + packageData.amount,
      })
      .eq('id', user.id);

    // Create transaction record
    await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'package_investment',
        amount: packageData.amount,
        status: 'completed',
        description: `Package purchase: ${packageInfo.name}`,
        metadata: { package_id: packageData.package_id },
      });

    // Process level income for upline
    await processLevelIncome(user.id, packageData.amount);

    // Update binary tree volumes
    await updateBinaryTreeVolumes(user.id, packageData.amount);

    // Check and process matching bonuses
    await checkMatchingBonuses(user.id);

    // Check and award rank achievements
    await checkRankAchievement(user.id);

    // Calculate and award booster income (if applicable)
    if (userData.sponsor_id) {
      await calculateBoosterIncome(userData.sponsor_id);
    }

    return userPackage as UserPackage;
  } catch (error: any) {
    console.error('Purchase package error:', error);
    throw new Error(error.message || 'Failed to purchase package');
  }
};

// ============================================
// MLM INCOME PROCESSING
// ============================================

/**
 * Process level income distribution
 * Now uses database-driven configuration instead of hardcoded values
 */
const processLevelIncome = async (sourceUserId: string, amount: number): Promise<void> => {
  try {
    // Load level income config from database
    const levelIncomeConfig = await getLevelIncomeConfig();
    if (!levelIncomeConfig || levelIncomeConfig.length === 0) {
      console.error('Level income config not loaded from database');
      return;
    }

    let currentUserId = sourceUserId;
    let level = 1;

    while (level <= 30) {
      // Get sponsor
      const { data: userData } = await supabase
        .from('users')
        .select('sponsor_id, levels_unlocked, wallet_balance, total_earnings')
        .eq('id', currentUserId)
        .single();

      if (!userData || !userData.sponsor_id) break;

      const sponsorId = userData.sponsor_id;

      // Check if sponsor has this level unlocked
      const { data: sponsorData } = await supabase
        .from('users')
        .select('levels_unlocked, wallet_balance, total_earnings')
        .eq('id', sponsorId)
        .single();

      if (sponsorData && sponsorData.levels_unlocked >= level) {
        // Get income config for this level from database
        const incomeConfig = levelIncomeConfig.find(c => c.level === level);
        if (incomeConfig) {
          // Calculate income based on percentage or fixed amount
          const incomeAmount = incomeConfig.percentage > 0
            ? amount * (incomeConfig.percentage / 100)
            : incomeConfig.amount;

          if (incomeAmount > 0) {
            // Credit income to sponsor
            await supabase
              .from('users')
              .update({
                wallet_balance: sponsorData.wallet_balance + incomeAmount,
                total_earnings: sponsorData.total_earnings + incomeAmount,
              })
              .eq('id', sponsorId);

            // Record level income
            await supabase
              .from('level_incomes')
              .insert({
                user_id: sponsorId,
                from_user_id: sourceUserId,
                level,
                amount: incomeAmount,
                income_type: 'direct_income',
              });

            // Create transaction
            await supabase
              .from('mlm_transactions')
              .insert({
                user_id: sponsorId,
                from_user_id: sourceUserId,
                transaction_type: 'level_income',
                amount: incomeAmount,
                level,
                status: 'completed',
                description: `Level ${level} income (${incomeConfig.percentage}%) from package purchase`,
              });
          }
        }
      }

      currentUserId = sponsorId;
      level++;
    }
  } catch (error) {
    console.error('Process level income error:', error);
  }
};

/**
 * Update binary tree volumes
 */
const updateBinaryTreeVolumes = async (userId: string, amount: number): Promise<void> => {
  try {
    // Get user's position in tree
    const { data: treeData } = await supabase
      .from('binary_nodes')
      .select('parent_id, position')
      .eq('user_id', userId)
      .single();

    if (!treeData || !treeData.parent_id) return;

    let currentParentId = treeData.parent_id;
    let position = treeData.position;

    // Update volumes up the tree
    while (currentParentId) {
      const { data: parentTree } = await supabase
        .from('binary_nodes')
        .select('left_volume, right_volume, parent_id, position')
        .eq('user_id', currentParentId)
        .single();

      if (!parentTree) break;

      // Update the appropriate leg volume
      const updateData = position === 'left'
        ? { left_volume: parentTree.left_volume + amount }
        : { right_volume: parentTree.right_volume + amount };

      await supabase
        .from('binary_nodes')
        .update(updateData)
        .eq('user_id', currentParentId);

      // Also update user table
      const userUpdateData = position === 'left'
        ? { left_volume: parentTree.left_volume + amount }
        : { right_volume: parentTree.right_volume + amount };

      await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', currentParentId);

      currentParentId = parentTree.parent_id;
      position = parentTree.position;
    }
  } catch (error) {
    console.error('Update binary tree volumes error:', error);
  }
};

/**
 * Check and process matching bonuses
 * Now uses database-driven configuration instead of hardcoded values
 */
const checkMatchingBonuses = async (userId: string): Promise<void> => {
  try {
    // Load matching bonus tiers from database
    const matchingBonusTiers = await getMatchingBonusTiers();
    if (!matchingBonusTiers || matchingBonusTiers.length === 0) {
      console.error('Matching bonus tiers not loaded from database');
      return;
    }

    // Get user's binary tree data
    const { data: treeData } = await supabase
      .from('binary_nodes')
      .select('left_volume, right_volume')
      .eq('user_id', userId)
      .single();

    if (!treeData) return;

    const leftVol = treeData.left_volume;
    const rightVol = treeData.right_volume;
    const minVol = Math.min(leftVol, rightVol);

    // Check which tier they qualify for (start from highest tier)
    for (let i = matchingBonusTiers.length - 1; i >= 0; i--) {
      const tier = matchingBonusTiers[i];

      if (minVol >= tier.leftMatches && minVol >= tier.rightMatches) {
        // Check if they've already received this bonus
        const { data: existingBonus } = await supabase
          .from('matching_bonuses')
          .select('*')
          .eq('user_id', userId)
          .eq('left_matches', tier.leftMatches)
          .eq('right_matches', tier.rightMatches)
          .single();

        if (!existingBonus) {
          // Award bonus
          const { data: userData } = await supabase
            .from('users')
            .select('wallet_balance, total_earnings')
            .eq('id', userId)
            .single();

          if (userData) {
            // Credit bonus
            await supabase
              .from('users')
              .update({
                wallet_balance: userData.wallet_balance + tier.bonusAmount,
                total_earnings: userData.total_earnings + tier.bonusAmount,
              })
              .eq('id', userId);

            // Record matching bonus
            await supabase
              .from('matching_bonuses')
              .insert({
                user_id: userId,
                left_matches: tier.leftMatches,
                right_matches: tier.rightMatches,
                bonus_amount: tier.bonusAmount,
              });

            // Create transaction
            await supabase
              .from('mlm_transactions')
              .insert({
                user_id: userId,
                transaction_type: 'matching_bonus',
                amount: tier.bonusAmount,
                status: 'completed',
                description: `Matching bonus: ${tier.tierName} (${tier.leftMatches}-${tier.rightMatches})`,
              });
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Check matching bonuses error:', error);
  }
};

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * Auto-create user profile in public.users if it doesn't exist
 * This handles cases where auth.users exists but public.users doesn't
 */
const ensureUserProfile = async (authUser: any): Promise<any> => {
  // Try to get existing user
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return existing;

  console.log('⚠️  User not found in public.users, creating profile for:', authUser.email);

  // Create new user profile
  // NOTE: password_hash is set to placeholder since auth is handled by Supabase Auth
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      wallet_address: authUser.user_metadata?.wallet_address || null,
      password_hash: 'AUTH_MANAGED_BY_SUPABASE', // Placeholder - real auth via Supabase Auth
      wallet_balance: 0,
      total_investment: 0,
      total_earnings: 0,
      direct_count: 0,
      team_count: 0,
      left_volume: 0,
      right_volume: 0,
      current_rank: 'starter',
      levels_unlocked: 0,
      is_active: true,
      role: 'user',
      created_at: authUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create user profile:', createError);
    throw new Error(`Failed to create user profile: ${createError.message}`);
  }

  console.log('✅ Created new user profile for:', newUser.email);

  // Complete MLM onboarding (referral code, binary tree placement)
  try {
    await completeMlmOnboarding(newUser.id);
  } catch (onboardError) {
    console.error('⚠️  MLM onboarding failed (non-critical):', onboardError);
  }

  return newUser;
};

/**
 * Get complete user dashboard data
 */
export const getUserDashboard = async (userId?: string): Promise<UserDashboardData> => {
  try {
    // NEW: Use MySQL API instead of Supabase
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

    if (token) {
      console.log('🔍 getUserDashboard - Using MySQL API');

      const response = await fetch('http://localhost:3001/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dashboard data from MySQL:', data);

        return {
          user: {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            wallet_balance: data.user.wallet_balance || 0,
            total_investment: data.user.total_investment || 0,
            total_earnings: data.user.total_earnings || 0,
            direct_count: data.statistics.direct_referrals || 0,
            team_count: data.statistics.total_team || 0,
            current_rank: data.user.current_rank || 'bronze',
            robot_subscription_active: false,
            robot_subscription_expires_at: null,
            kyc_status: 'pending',
            levels_unlocked: 30,
          },
          statistics: {
            today_earnings: data.statistics.today_earnings || 0,
            week_earnings: data.statistics.week_earnings || 0,
            month_earnings: data.statistics.month_earnings || 0,
            left_volume: data.statistics.left_binary_volume || 0,
            right_volume: data.statistics.right_binary_volume || 0,
            total_volume: (data.statistics.left_binary_volume || 0) + (data.statistics.right_binary_volume || 0),
            roi_earned: data.statistics.roi_earned || 0,
          },
          recent_transactions: [],
          active_packages: [],
          direct_referrals: [],
          notifications: [],
          next_rank: {
            rank: data.next_rank.next || 'platinum',
            min_volume: 100000,
            reward_amount: 5000,
            levels_unlocked: 30,
          },
        };
      }
    }

    // Fallback to Supabase (original code below)
    // Use provided userId or get from auth
    let targetUserId = userId;
    let authUser = null;

    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');
      targetUserId = user.id;
      authUser = user;
    }

    console.log('🔍 getUserDashboard - Target User ID:', targetUserId);

    // Get user data from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (userError || !userData) {
      // NOTE: With local PostgreSQL, all users should already exist in the database
      // Auto-creation is disabled since we manage users directly
      console.error('❌ User not found:', targetUserId);
      throw new Error(`User not found: ${targetUserId}. Please ensure user exists in database.`);
    } else {
      console.log('✅ User profile found:', userData.email);
    }

    // Re-fetch userData after potential creation
    const { data: finalUserData } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (!finalUserData) throw new Error('Failed to load user data');

    // Get statistics
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setMonth(now.getMonth() - 1));

    // Today's earnings
    const { data: todayEarnings } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', targetUserId)
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income', 'rank_reward'])
      .gte('created_at', todayStart.toISOString());

    const todayTotal = todayEarnings?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Week's earnings
    const { data: weekEarnings } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', targetUserId)
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income', 'rank_reward'])
      .gte('created_at', weekStart.toISOString());

    const weekTotal = weekEarnings?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Month's earnings
    const { data: monthEarnings } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', targetUserId)
      .in('transaction_type', ['level_income', 'matching_bonus', 'booster_income', 'rank_reward'])
      .gte('created_at', monthStart.toISOString());

    const monthTotal = monthEarnings?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Get ROI earned
    let packages = [];
    let roiEarned = 0;
    try {
      packages = await getUserPackages(targetUserId);
      roiEarned = packages.reduce((sum, p) => sum + p.roi_earned, 0);
    } catch (packagesError: any) {
      console.error('⚠️  Failed to load user packages (non-critical):', packagesError.message);
      // Continue without packages - not critical for dashboard to load
      packages = [];
      roiEarned = 0;
    }

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('mlm_transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get direct referrals
    const { data: directs } = await supabase
      .from('users')
      .select('id, email, full_name, total_investment, created_at')
      .eq('sponsor_id', targetUserId)
      .order('created_at', { ascending: false });

    // Get notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    // Find next rank using database config
    const rankRequirements = await getRankRequirements();
    const currentRankIndex = rankRequirements.findIndex(r => r.rank === finalUserData.current_rank?.toLowerCase());
    const nextRank = rankRequirements[currentRankIndex + 1] || rankRequirements[rankRequirements.length - 1] || {
      rank: 'bronze',
      min_volume: 10000,
      reward_amount: 500,
      levels_unlocked: 5
    };

    return {
      user: {
        id: finalUserData.id,
        email: finalUserData.email,
        full_name: finalUserData.full_name,
        wallet_balance: finalUserData.wallet_balance,
        total_investment: finalUserData.total_investment,
        total_earnings: finalUserData.total_earnings,
        direct_count: finalUserData.direct_count,
        team_count: finalUserData.team_count,
        current_rank: finalUserData.current_rank,
        robot_subscription_active: finalUserData.robot_subscription_active,
        robot_subscription_expires_at: finalUserData.robot_subscription_expires_at,
        kyc_status: finalUserData.kyc_status,
        levels_unlocked: finalUserData.levels_unlocked,
      },
      statistics: {
        today_earnings: todayTotal,
        week_earnings: weekTotal,
        month_earnings: monthTotal,
        left_volume: finalUserData.left_volume,
        right_volume: finalUserData.right_volume,
        total_volume: finalUserData.left_volume + finalUserData.right_volume,
        roi_earned: roiEarned,
      },
      recent_transactions: transactions || [],
      active_packages: packages,
      direct_referrals: directs || [],
      notifications: notifications || [],
      next_rank: nextRank,
    };
  } catch (error: any) {
    console.error('Get user dashboard error:', error);
    throw new Error(error.message || 'Failed to fetch dashboard data');
  }
};

/**
 * Get binary tree for visualization
 */
export const getBinaryTree = async (userId?: string, depth: number = 3) => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    // Recursive function to build tree
    const buildTree = async (nodeUserId: string, currentDepth: number): Promise<any> => {
      if (currentDepth > depth) return null;

      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name, total_investment')
        .eq('id', nodeUserId)
        .single();

      if (!userData) return null;

      const { data: treeData } = await supabase
        .from('binary_nodes')
        .select('left_child_id, right_child_id, position, level')
        .eq('user_id', nodeUserId)
        .single();

      const node: any = {
        user_id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        total_investment: userData.total_investment,
        level: treeData?.level || 0,
        position: treeData?.position || 'root',
        children: [],
      };

      if (treeData) {
        if (treeData.left_child_id) {
          const leftChild = await buildTree(treeData.left_child_id, currentDepth + 1);
          if (leftChild) node.children.push(leftChild);
        }

        if (treeData.right_child_id) {
          const rightChild = await buildTree(treeData.right_child_id, currentDepth + 1);
          if (rightChild) node.children.push(rightChild);
        }
      }

      return node;
    };

    return await buildTree(targetUserId, 1);
  } catch (error: any) {
    console.error('Get binary tree error:', error);
    throw new Error(error.message || 'Failed to fetch binary tree');
  }
};

// ============================================
// REGISTRATION & ONBOARDING
// ============================================

export interface ReferralValidation {
  valid: boolean;
  userId?: string;
  userName?: string;
}

/**
 * Validate referral code
 */
export const validateReferralCode = async (code: string): Promise<ReferralValidation> => {
  try {
    if (!code || code.trim() === '') {
      return { valid: false };
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('user_id, users!inner(full_name, is_active)')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { valid: false };
    }

    const userData: any = data.users;
    if (!userData || !userData.is_active) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: data.user_id,
      userName: userData.full_name || 'Unknown'
    };
  } catch (error: any) {
    console.error('Validate referral code error:', error);
    return { valid: false };
  }
};

/**
 * Generate unique referral code for new user
 */
export const generateReferralCode = async (userId: string): Promise<string> => {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    // Generate 8-character code
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      // Recursively try again
      return generateReferralCode(userId);
    }

    // Insert code
    const { error } = await supabase
      .from('referral_codes')
      .insert({
        user_id: userId,
        code,
        clicks: 0,
        signups: 0,
        is_active: true
      });

    if (error) throw error;

    return code;
  } catch (error: any) {
    console.error('Generate referral code error:', error);
    throw new Error('Failed to generate referral code');
  }
};

/**
 * Create referral relationship between sponsor and new user
 */
export const createReferral = async (sponsorId: string, newUserId: string, referralCode: string): Promise<void> => {
  try {
    // Insert referral record
    await supabase
      .from('referrals')
      .insert({
        referrer_id: sponsorId,
        referee_id: newUserId,
        referral_code: referralCode,
        status: 'active',
        commission_earned: 0
      });

    // Update referral code signup count
    await supabase.rpc('increment_referral_signups', { referral_code: referralCode });

    // Update sponsor stats
    const { data: sponsorData } = await supabase
      .from('users')
      .select('direct_count, team_count')
      .eq('id', sponsorId)
      .single();

    if (sponsorData) {
      await supabase
        .from('users')
        .update({
          direct_count: (sponsorData.direct_count || 0) + 1,
          team_count: (sponsorData.team_count || 0) + 1
        })
        .eq('id', sponsorId);
    }
  } catch (error: any) {
    console.error('Create referral error:', error);
    // Don't throw - this shouldn't block registration
  }
};

/**
 * Find best binary tree placement for new user
 */
export const findBinaryTreePlacement = async (sponsorId: string): Promise<{ parentId: string; position: 'left' | 'right' | 'root'; level: number }> => {
  try {
    // Get sponsor's binary tree node
    const { data: sponsorNode } = await supabase
      .from('binary_nodes')
      .select('*')
      .eq('user_id', sponsorId)
      .maybeSingle();

    // If sponsor doesn't have a tree node, they are root
    if (!sponsorNode) {
      return {
        parentId: sponsorId,
        position: 'root',
        level: 0
      };
    }

    // Check left position
    if (!sponsorNode.left_child_id) {
      return {
        parentId: sponsorId,
        position: 'left',
        level: sponsorNode.level + 1
      };
    }

    // Check right position
    if (!sponsorNode.right_child_id) {
      return {
        parentId: sponsorId,
        position: 'right',
        level: sponsorNode.level + 1
      };
    }

    // Both positions filled, find next available using BFS
    const queue = [sponsorNode.left_child_id, sponsorNode.right_child_id];

    while (queue.length > 0) {
      const currentUserId = queue.shift();
      if (!currentUserId) continue;

      const { data: currentNode } = await supabase
        .from('binary_nodes')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (!currentNode) continue;

      if (!currentNode.left_child_id) {
        return {
          parentId: currentUserId,
          position: 'left',
          level: currentNode.level + 1
        };
      }

      if (!currentNode.right_child_id) {
        return {
          parentId: currentUserId,
          position: 'right',
          level: currentNode.level + 1
        };
      }

      if (currentNode.left_child_id) queue.push(currentNode.left_child_id);
      if (currentNode.right_child_id) queue.push(currentNode.right_child_id);
    }

    // Fallback
    return {
      parentId: sponsorId,
      position: 'left',
      level: sponsorNode.level + 1
    };
  } catch (error: any) {
    console.error('Find binary tree placement error:', error);
    return {
      parentId: sponsorId,
      position: 'left',
      level: 1
    };
  }
};

/**
 * Place user in binary tree
 */
export const placeBinaryTree = async (userId: string, placement: { parentId: string; position: 'left' | 'right' | 'root'; level: number }): Promise<void> => {
  try {
    // Create binary tree node
    await supabase
      .from('binary_nodes')
      .insert({
        user_id: userId,
        parent_id: placement.position === 'root' ? null : placement.parentId,
        level: placement.level,
        position: placement.position,
        left_volume: 0,
        right_volume: 0
      });

    // Update parent's child reference
    if (placement.position !== 'root') {
      const updateField = placement.position === 'left' ? 'left_child_id' : 'right_child_id';

      await supabase
        .from('binary_nodes')
        .update({ [updateField]: userId })
        .eq('user_id', placement.parentId);

      // Update user's placement info
      await supabase
        .from('users')
        .update({
          placement_id: placement.parentId,
          position: placement.position
        })
        .eq('id', userId);
    }
  } catch (error: any) {
    console.error('Place binary tree error:', error);
    // Don't throw - this shouldn't block registration
  }
};

/**
 * Complete MLM onboarding for new user
 * Called after Supabase Auth user creation
 */
export const completeMlmOnboarding = async (userId: string, sponsorId?: string): Promise<void> => {
  try {
    // Generate referral code for new user
    const userReferralCode = await generateReferralCode(userId);
    console.log(`Generated referral code ${userReferralCode} for user ${userId}`);

    // If has sponsor, create referral relationship and place in binary tree
    if (sponsorId) {
      // Update user's sponsor_id
      await supabase
        .from('users')
        .update({ sponsor_id: sponsorId })
        .eq('id', userId);

      // Create referral record
      await createReferral(sponsorId, userId, userReferralCode);

      // Find and place in binary tree
      const placement = await findBinaryTreePlacement(sponsorId);
      await placeBinaryTree(userId, placement);

      console.log(`Placed user ${userId} in binary tree under ${sponsorId} at ${placement.position}`);
    } else {
      // No sponsor - create as root in binary tree
      await placeBinaryTree(userId, {
        parentId: userId,
        position: 'root',
        level: 0
      });
    }

    // Initialize wallet
    await supabase
      .from('users')
      .update({
        wallet_balance: 0,
        total_investment: 0,
        total_earnings: 0,
        direct_count: 0,
        team_count: 0,
        left_volume: 0,
        right_volume: 0,
        current_rank: 'starter',
        levels_unlocked: 0
      })
      .eq('id', userId);

    console.log(`MLM onboarding complete for user ${userId}`);
  } catch (error: any) {
    console.error('Complete MLM onboarding error:', error);
    // Don't throw - log and continue
  }
};

// ============================================
// RANK ACHIEVEMENT SYSTEM
// ============================================

/**
 * Check and award rank achievements
 * Called after volume updates or purchases
 * Now uses database-driven configuration instead of hardcoded values
 */
export const checkRankAchievement = async (userId: string): Promise<void> => {
  try {
    // Load rank requirements from database
    const rankRequirements = await getRankRequirements();
    if (!rankRequirements || rankRequirements.length === 0) {
      console.error('Rank requirements not loaded from database');
      return;
    }

    // Get user's current data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_rank, total_investment, left_volume, right_volume, levels_unlocked')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data for rank check:', userError);
      return;
    }

    // Calculate total volume (left + right + personal investment)
    const totalVolume = userData.total_investment + userData.left_volume + userData.right_volume;

    // Get all rank achievements already earned by this user
    const { data: existingAchievements } = await supabase
      .from('rank_achievements')
      .select('rank')
      .eq('user_id', userId);

    const achievedRanks = existingAchievements?.map(a => a.rank.toLowerCase()) || [];

    // Find the highest rank user qualifies for
    let highestQualifiedRank = userData.current_rank?.toLowerCase() || 'starter';
    let rankToAward = null;

    for (const requirement of rankRequirements) {
      // Check if user qualifies for this rank
      if (totalVolume >= requirement.min_volume) {
        // Check if user hasn't already achieved this rank
        if (!achievedRanks.includes(requirement.rank)) {
          // Check if this is higher than current rank
          const currentRankIndex = rankRequirements.findIndex(r => r.rank === userData.current_rank?.toLowerCase());
          const newRankIndex = rankRequirements.findIndex(r => r.rank === requirement.rank);

          if (newRankIndex > currentRankIndex) {
            highestQualifiedRank = requirement.rank;
            rankToAward = requirement;
          }
        }
      }
    }

    // If user qualifies for a new rank, award it
    if (rankToAward && rankToAward.reward_amount > 0) {
      console.log(`User ${userId} achieved rank: ${rankToAward.rank} with volume: ${totalVolume}`);

      // Create rank achievement record
      await supabase
        .from('rank_achievements')
        .insert({
          user_id: userId,
          rank: rankToAward.rank,
          total_volume: totalVolume,
          reward_amount: rankToAward.reward_amount,
          achieved_at: new Date().toISOString()
        });

      // Update user's current rank and wallet balance
      const { data: currentUserData } = await supabase
        .from('users')
        .select('wallet_balance, total_earnings')
        .eq('id', userId)
        .single();

      if (currentUserData) {
        await supabase
          .from('users')
          .update({
            current_rank: rankToAward.rank,
            levels_unlocked: rankToAward.levels_unlocked,
            wallet_balance: currentUserData.wallet_balance + rankToAward.reward_amount,
            total_earnings: currentUserData.total_earnings + rankToAward.reward_amount
          })
          .eq('id', userId);

        // Create transaction record
        await supabase
          .from('mlm_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'rank_bonus',
            amount: rankToAward.reward_amount,
            status: 'completed',
            description: `Rank Achievement Bonus: ${rankToAward.rank.toUpperCase()}`,
            metadata: {
              rank: rankToAward.rank,
              total_volume: totalVolume,
              reward_amount: rankToAward.reward_amount,
              levels_unlocked: rankToAward.levels_unlocked
            }
          });

        console.log(`Awarded ${rankToAward.reward_amount} USD rank bonus to user ${userId}. Unlocked ${rankToAward.levels_unlocked} levels.`);
      }
    }
  } catch (error: any) {
    console.error('Check rank achievement error:', error);
  }
};

// ============================================
// BOOSTER INCOME SYSTEM
// ============================================

/**
 * Calculate and award booster income
 * 10% bonus when two direct referrals both make purchases in 30 days
 */
export const calculateBoosterIncome = async (userId: string): Promise<void> => {
  try {
    // Get user's direct referrals
    const { data: directReferrals, error: referralsError } = await supabase
      .from('users')
      .select('id, total_investment')
      .eq('sponsor_id', userId);

    if (referralsError || !directReferrals || directReferrals.length < 2) {
      // Need at least 2 direct referrals for booster income
      return;
    }

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all booster incomes already awarded in the last 30 days
    const { data: existingBoosters } = await supabase
      .from('booster_incomes')
      .select('direct_1_id, direct_2_id')
      .eq('user_id', userId)
      .gte('period_start', thirtyDaysAgo.toISOString());

    const awardedPairs = new Set(
      existingBoosters?.map(b => `${b.direct_1_id}|${b.direct_2_id}`) || []
    );

    // Check each pair of directs
    for (let i = 0; i < directReferrals.length; i++) {
      for (let j = i + 1; j < directReferrals.length; j++) {
        const direct1 = directReferrals[i];
        const direct2 = directReferrals[j];

        // Create pair identifier (sorted to avoid duplicates)
        const pairId = [direct1.id, direct2.id].sort().join('|');

        // Skip if this pair already received booster income
        if (awardedPairs.has(pairId)) {
          continue;
        }

        // Get purchases made by both directs in the last 30 days
        const { data: direct1Packages } = await supabase
          .from('user_packages')
          .select('amount')
          .eq('user_id', direct1.id)
          .gte('purchased_at', thirtyDaysAgo.toISOString());

        const { data: direct2Packages } = await supabase
          .from('user_packages')
          .select('amount')
          .eq('user_id', direct2.id)
          .gte('purchased_at', thirtyDaysAgo.toISOString());

        // Calculate total volume from both directs
        const direct1Volume = direct1Packages?.reduce((sum, pkg) => sum + pkg.amount, 0) || 0;
        const direct2Volume = direct2Packages?.reduce((sum, pkg) => sum + pkg.amount, 0) || 0;

        // If both directs made purchases in last 30 days, award 10% booster
        if (direct1Volume > 0 && direct2Volume > 0) {
          const combinedVolume = direct1Volume + direct2Volume;
          const boosterAmount = combinedVolume * 0.10; // 10% bonus

          console.log(`Awarding booster income to user ${userId}: $${boosterAmount}`);

          // Create booster income record
          await supabase
            .from('booster_incomes')
            .insert({
              user_id: userId,
              direct_1_id: direct1.id,
              direct_2_id: direct2.id,
              amount: boosterAmount,
              period_start: thirtyDaysAgo.toISOString(),
              period_end: new Date().toISOString()
            });

          // Credit wallet balance
          const { data: currentUserData } = await supabase
            .from('users')
            .select('wallet_balance, total_earnings')
            .eq('id', userId)
            .single();

          if (currentUserData) {
            await supabase
              .from('users')
              .update({
                wallet_balance: currentUserData.wallet_balance + boosterAmount,
                total_earnings: currentUserData.total_earnings + boosterAmount
              })
              .eq('id', userId);

            // Create transaction record
            await supabase
              .from('mlm_transactions')
              .insert({
                user_id: userId,
                transaction_type: 'booster_income',
                amount: boosterAmount,
                status: 'completed',
                description: `Booster Income: 10% of ${combinedVolume} USD from 2 directs`,
                metadata: {
                  direct_1_id: direct1.id,
                  direct_2_id: direct2.id,
                  direct_1_volume: direct1Volume,
                  direct_2_volume: direct2Volume,
                  combined_volume: combinedVolume,
                  booster_percentage: 10
                }
              });

            console.log(`Booster income of $${boosterAmount} awarded to user ${userId}`);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Calculate booster income error:', error);
  }
};

// ============================================
// ROI DISTRIBUTION SYSTEM
// ============================================

/**
 * Distribute daily ROI to all active packages
 * This should be called once per day via cron job or scheduled task
 */
export const distributeDailyROI = async (): Promise<{ processed: number; total_amount: number; errors: number }> => {
  try {
    console.log('Starting daily ROI distribution...');

    // Get all active packages (without packages join - FK may not exist)
    const { data: activePackages, error: packagesError } = await supabase
      .from('user_packages')
      .select(`
        id,
        user_id,
        package_id,
        amount,
        roi_percentage,
        roi_earned,
        purchased_at,
        is_active
      `)
      .eq('is_active', true);

    if (packagesError) throw packagesError;

    if (!activePackages || activePackages.length === 0) {
      console.log('No active packages found for ROI distribution');
      return { processed: 0, total_amount: 0, errors: 0 };
    }

    console.log(`Found ${activePackages.length} active packages for ROI distribution`);

    let processedCount = 0;
    let totalAmountDistributed = 0;
    let errorCount = 0;

    const today = new Date();

    // Process each package
    for (const pkg of activePackages) {
      try {
        const packageData: any = pkg.packages;
        const durationDays = packageData?.duration_days || 365;
        const purchasedDate = new Date(pkg.purchased_at);

        // Calculate days since purchase
        const daysSincePurchase = Math.floor((today.getTime() - purchasedDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check if package has expired
        if (daysSincePurchase >= durationDays) {
          console.log(`Package ${pkg.id} has matured (${daysSincePurchase} days). Deactivating...`);

          // Deactivate the package
          await supabase
            .from('user_packages')
            .update({
              is_active: false,
              maturity_date: today.toISOString()
            })
            .eq('id', pkg.id);

          continue; // Skip ROI distribution for matured package
        }

        // Calculate daily ROI
        const dailyRoiAmount = pkg.amount * (pkg.roi_percentage / 100);

        // Check if maximum ROI has been reached (some packages may have max ROI)
        const maxRoi = pkg.amount * 3; // Example: 300% maximum return
        if (pkg.roi_earned + dailyRoiAmount > maxRoi) {
          console.log(`Package ${pkg.id} has reached maximum ROI. Deactivating...`);

          // Deactivate package that reached max ROI
          await supabase
            .from('user_packages')
            .update({
              is_active: false,
              maturity_date: today.toISOString()
            })
            .eq('id', pkg.id);

          continue;
        }

        // Get user's current wallet balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('wallet_balance, total_earnings')
          .eq('id', pkg.user_id)
          .single();

        if (userError || !userData) {
          console.error(`Error fetching user ${pkg.user_id}:`, userError);
          errorCount++;
          continue;
        }

        // Credit ROI to user's wallet
        await supabase
          .from('users')
          .update({
            wallet_balance: userData.wallet_balance + dailyRoiAmount,
            total_earnings: userData.total_earnings + dailyRoiAmount
          })
          .eq('id', pkg.user_id);

        // Update package's ROI earned
        await supabase
          .from('user_packages')
          .update({
            roi_earned: pkg.roi_earned + dailyRoiAmount
          })
          .eq('id', pkg.id);

        // Create transaction record
        await supabase
          .from('mlm_transactions')
          .insert({
            user_id: pkg.user_id,
            transaction_type: 'roi_income',
            amount: dailyRoiAmount,
            status: 'completed',
            description: `Daily ROI from ${packageData?.name || 'package'} (Day ${daysSincePurchase + 1}/${durationDays})`,
            metadata: {
              package_id: pkg.package_id,
              user_package_id: pkg.id,
              daily_roi_percentage: pkg.roi_percentage,
              day_number: daysSincePurchase + 1,
              total_duration: durationDays
            }
          });

        processedCount++;
        totalAmountDistributed += dailyRoiAmount;

        console.log(`ROI distributed to user ${pkg.user_id}: $${dailyRoiAmount.toFixed(2)} (Package ${pkg.id})`);
      } catch (pkgError: any) {
        console.error(`Error processing package ${pkg.id}:`, pkgError);
        errorCount++;
      }
    }

    console.log(`Daily ROI distribution complete. Processed: ${processedCount}, Total: $${totalAmountDistributed.toFixed(2)}, Errors: ${errorCount}`);

    return {
      processed: processedCount,
      total_amount: totalAmountDistributed,
      errors: errorCount
    };
  } catch (error: any) {
    console.error('Daily ROI distribution error:', error);
    throw new Error(error.message || 'Failed to distribute daily ROI');
  }
};

// ============================================
// TEAM MANAGEMENT
// ============================================

/**
 * Get team members for a user
 * Returns all downline members across all levels
 */
export const getTeamMembers = async (userId?: string) => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    console.log('🔍 Fetching team members for user:', targetUserId);

    // OPTIMIZATION: Get ALL users in ONE query instead of recursive queries
    const { data: allUsers, error } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        total_investment,
        created_at,
        level,
        sponsor_id,
        position,
        is_active,
        left_volume,
        right_volume,
        direct_count,
        team_count
      `);

    if (error) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log(`📊 Total users in database: ${allUsers?.length || 0}`);

    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users found in database');
      return [];
    }

    console.log(`📊 Loaded ${allUsers.length} total users from database`);

    // Build team hierarchy in memory using BFS with level tracking
    const teamMembers: any[] = [];
    const queue: Array<{ id: string; level: number }> = [{ id: targetUserId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentId = current.id;
      const currentLevel = current.level;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find all direct referrals of current user
      allUsers.forEach(user => {
        if (user.sponsor_id === currentId && !visited.has(user.id)) {
          const memberLevel = currentLevel + 1;

          teamMembers.push({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            total_investment: parseFloat(user.total_investment) || 0,
            created_at: user.created_at,
            level: memberLevel, // FIXED: Calculate actual level from sponsor
            sponsor_id: user.sponsor_id,
            position: user.position || 'left',
            is_active: user.is_active !== false,
            left_volume: parseFloat(user.left_volume) || 0,
            right_volume: parseFloat(user.right_volume) || 0,
            directReferrals: user.direct_count || 0,
            teamSize: user.team_count || 0
          });

          queue.push({ id: user.id, level: memberLevel });
        }
      });
    }

    console.log(`✅ Found ${teamMembers.length} team members (Levels 1-30)`);

    return teamMembers;

  } catch (error: any) {
    console.error('❌ Get team members error:', error.message);
    toast.error('Failed to load team members');
    return [];
  }
};

/**
 * Get comprehensive team statistics
 * FIXED: Calculate real-time stats from actual team data
 */
export const getTeamStats = async (userId?: string) => {
  try {
    const teamMembers = await getTeamMembers(userId);

    // Calculate real-time statistics
    const totalTeamSize = teamMembers.length;
    const directCount = teamMembers.filter(m => m.level === 1).length;
    const totalVolume = teamMembers.reduce((sum, m) => sum + (parseFloat(m.total_investment) || 0), 0);

    // Count members by level
    const levelBreakdown: { [key: number]: number } = {};
    let maxLevel = 0;

    teamMembers.forEach(member => {
      const level = member.level || 1;
      levelBreakdown[level] = (levelBreakdown[level] || 0) + 1;
      if (level > maxLevel) maxLevel = level;
    });

    return {
      totalTeamSize,
      directCount,
      totalVolume,
      levelsUnlocked: maxLevel,
      levelBreakdown,
      teamMembers
    };
  } catch (error: any) {
    console.error('❌ Get team stats error:', error.message);
    return {
      totalTeamSize: 0,
      directCount: 0,
      totalVolume: 0,
      levelsUnlocked: 0,
      levelBreakdown: {},
      teamMembers: []
    };
  }
};

/**
 * Get referrals for a user
 */
export const getReferrals = async (userId?: string) => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referee:users!referee_id (
          id,
          full_name,
          email,
          total_investment,
          created_at,
          is_active
        )
      `)
      .eq('referrer_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (referrals || []).map((ref: any) => ({
      id: ref.id,
      refereeId: ref.referee_id,
      refereeName: ref.referee?.full_name || 'Unknown',
      refereeEmail: ref.referee?.email || '',
      referralCode: ref.referral_code,
      status: ref.status,
      commissionEarned: ref.commission_earned || 0,
      totalInvestment: ref.referee?.total_investment || 0,
      joinDate: ref.created_at,
      isActive: ref.referee?.is_active || false,
    }));
  } catch (error: any) {
    console.error('Get referrals error:', error);
    throw new Error(error.message || 'Failed to fetch referrals');
  }
};

/**
 * Get transaction history for a user
 * @param limit Maximum number of transactions to return (default: 100)
 * @param offset Number of transactions to skip (default: 0)
 * @param userId Optional user ID (defaults to current authenticated user)
 * @returns Array of transactions
 */
export const getTransactionHistory = async (limit: number = 100, offset: number = 0, userId?: string) => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data: transactions, error } = await supabase
      .from('mlm_transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (transactions || []).map((tx: any) => ({
      id: tx.id,
      userId: tx.user_id,
      transactionType: tx.transaction_type,
      amount: parseFloat(tx.amount || 0),
      description: tx.description || '',
      referenceId: tx.reference_id,
      status: tx.status || 'completed',
      createdAt: tx.created_at,
      metadata: tx.metadata || {},
    }));
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    throw new Error(error.message || 'Failed to fetch transaction history');
  }
};
