/**
 * Package Service
 * Handles all package-related operations including purchase, claims, and stats
 */


import {
  Package,
  UserPackage,
  PackagePurchaseRequest,
  PackagePurchaseResponse,
  PackageStats,
  PackageClaimRequest,
  PackageClaimResponse,
} from '../types/package.types';

/**
 * Get all active packages available for purchase
 */
export const getAvailablePackages = async (): Promise<Package[]> => {
  try {
    console.log('🔍 Fetching available packages...');
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('status', 'active')  // Changed from 'is_active' to 'status'
      .order('price', { ascending: true });

    if (error) {
      console.error('❌ Error fetching packages:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} active packages`);

    // Calculate return values for each package
    const packagesWithCalculations = (data || []).map((pkg: Package) => ({
      ...pkg,
      daily_return: (pkg.price * pkg.daily_return_percentage) / 100,
      total_return: (pkg.price * (pkg.max_return_percentage || 100)) / 100,
    }));

    return packagesWithCalculations;
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    throw new Error(error.message || 'Failed to load packages');
  }
};

/**
 * Get a single package by ID
 */
export const getPackageById = async (packageId: string): Promise<Package | null> => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      daily_return: (data.price * data.daily_return_percentage) / 100,
      total_return: (data.price * data.max_return_percentage) / 100,
    };
  } catch (error: any) {
    console.error('Error fetching package:', error);
    throw new Error(error.message || 'Failed to load package');
  }
};

/**
 * Purchase a package with wallet balance
 */
export const purchasePackage = async (
  request: PackagePurchaseRequest
): Promise<PackagePurchaseResponse> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Verify payment password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: request.payment_password,
    });
    if (signInError) throw new Error('Invalid payment password');

    // Get package details
    const pkg = await getPackageById(request.package_id);
    if (!pkg) throw new Error('Package not found');

    // Validate investment amount
    if (request.amount < (pkg.min_investment || pkg.price)) {
      throw new Error(`Minimum investment is ${pkg.min_investment || pkg.price}`);
    }
    if (pkg.max_investment && request.amount > pkg.max_investment) {
      throw new Error(`Maximum investment is ${pkg.max_investment}`);
    }

    // Get user's wallet balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_balance, total_investment')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Check if user has sufficient balance
    if (userData.wallet_balance < request.amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Calculate package returns
    const dailyReturn = (request.amount * pkg.daily_return_percentage) / 100;
    const totalReturn = (request.amount * pkg.max_return_percentage) / 100;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + pkg.duration_days);

    // Start transaction: Deduct from wallet
    const newBalance = userData.wallet_balance - request.amount;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        total_investment: (userData.total_investment || 0) + request.amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Create user package subscription
    const { data: userPackage, error: packageError } = await supabase
      .from('user_packages')
      .insert({
        user_id: user.id,
        package_id: request.package_id,
        amount_invested: request.amount,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        daily_return: dailyReturn,
        total_return: totalReturn,
        claimed_return: 0,
        status: 'active',
      })
      .select()
      .single();

    if (packageError) throw packageError;

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'package_purchase',
        amount: -request.amount, // Negative because it's a deduction
        status: 'completed',
        metadata: {
          package_id: request.package_id,
          package_name: pkg.name,
          user_package_id: userPackage.id,
          daily_return: dailyReturn,
          total_return: totalReturn,
          duration_days: pkg.duration_days,
        },
      })
      .select()
      .single();

    if (txError) throw txError;

    return {
      user_package: { ...userPackage, package: pkg },
      transaction_id: transaction.id,
      message: `Successfully purchased ${pkg.name}! Daily returns will be available to claim.`,
    };
  } catch (error: any) {
    console.error('Error purchasing package:', error);
    throw new Error(error.message || 'Failed to purchase package');
  }
};

/**
 * Get user's active packages
 */
export const getUserPackages = async (
  status?: 'active' | 'completed' | 'cancelled' | 'paused'
): Promise<UserPackage[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('user_packages')
      .select(`
        *,
        package:packages (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error fetching user packages:', error);
    throw new Error(error.message || 'Failed to load your packages');
  }
};

/**
 * Calculate available returns to claim for a user package
 */
export const calculateAvailableReturns = (userPackage: UserPackage): number => {
  try {
    const now = new Date();
    const startDate = new Date(userPackage.start_date);
    const endDate = new Date(userPackage.end_date);
    const lastClaimDate = userPackage.last_claim_date
      ? new Date(userPackage.last_claim_date)
      : startDate;

    // Check if package is active and within valid date range
    if (userPackage.status !== 'active') return 0;
    if (now < startDate) return 0;

    // Calculate days elapsed since last claim
    const effectiveStartDate = new Date(Math.max(lastClaimDate.getTime(), startDate.getTime()));
    const effectiveEndDate = new Date(Math.min(now.getTime(), endDate.getTime()));

    const daysElapsed = Math.floor(
      (effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysElapsed <= 0) return 0;

    // Calculate returns: days * daily_return
    const availableReturn = daysElapsed * userPackage.daily_return;

    // Ensure we don't exceed total return
    const remainingReturn = userPackage.total_return - userPackage.claimed_return;
    return Math.min(availableReturn, remainingReturn);
  } catch (error) {
    console.error('Error calculating available returns:', error);
    return 0;
  }
};

/**
 * Claim available returns from a user package
 */
export const claimPackageReturns = async (
  request: PackageClaimRequest
): Promise<PackageClaimResponse> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get user package
    const { data: userPackage, error: packageError } = await supabase
      .from('user_packages')
      .select('*')
      .eq('id', request.user_package_id)
      .eq('user_id', user.id)
      .single();

    if (packageError) throw packageError;
    if (!userPackage) throw new Error('Package not found');

    // Calculate available returns
    const availableReturn = calculateAvailableReturns(userPackage);

    if (availableReturn <= 0) {
      throw new Error('No returns available to claim');
    }

    // Get current user balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Add returns to wallet
    const newBalance = userData.wallet_balance + availableReturn;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Update user package
    const newClaimedReturn = userPackage.claimed_return + availableReturn;
    const isCompleted = newClaimedReturn >= userPackage.total_return;

    const { error: updatePackageError } = await supabase
      .from('user_packages')
      .update({
        claimed_return: newClaimedReturn,
        last_claim_date: new Date().toISOString(),
        status: isCompleted ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.user_package_id);

    if (updatePackageError) throw updatePackageError;

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'package_return',
        amount: availableReturn,
        status: 'completed',
        metadata: {
          user_package_id: request.user_package_id,
          claimed_amount: availableReturn,
          total_claimed: newClaimedReturn,
        },
      })
      .select()
      .single();

    if (txError) throw txError;

    return {
      claimed_amount: availableReturn,
      transaction_id: transaction.id,
      new_wallet_balance: newBalance,
    };
  } catch (error: any) {
    console.error('Error claiming returns:', error);
    throw new Error(error.message || 'Failed to claim returns');
  }
};

/**
 * Get package statistics for user dashboard
 */
export const getPackageStats = async (): Promise<PackageStats> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get all user packages
    const { data: packages, error: packagesError } = await supabase
      .from('user_packages')
      .select('*')
      .eq('user_id', user.id);

    if (packagesError) throw packagesError;

    // Calculate stats
    const stats: PackageStats = {
      total_invested: 0,
      active_packages: 0,
      total_earned: 0,
      available_to_claim: 0,
    };

    packages?.forEach((pkg: UserPackage) => {
      stats.total_invested += pkg.amount_invested;

      if (pkg.status === 'active') {
        stats.active_packages++;
        stats.available_to_claim += calculateAvailableReturns(pkg);
      }

      stats.total_earned += pkg.claimed_return;
    });

    return stats;
  } catch (error: any) {
    console.error('Error fetching package stats:', error);
    throw new Error(error.message || 'Failed to load package statistics');
  }
};

/**
 * Get featured packages for homepage
 */
export const getFeaturedPackages = async (): Promise<Package[]> => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(3);

    if (error) throw error;

    return (data || []).map((pkg: Package) => ({
      ...pkg,
      daily_return: (pkg.price * pkg.daily_return_percentage) / 100,
      total_return: (pkg.price * pkg.max_return_percentage) / 100,
    }));
  } catch (error: any) {
    console.error('Error fetching featured packages:', error);
    throw new Error(error.message || 'Failed to load featured packages');
  }
};

/**
 * Check if user can purchase a package (has sufficient balance)
 */
export const canPurchasePackage = async (
  packageId: string,
  amount: number
): Promise<{ canPurchase: boolean; reason?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      return { canPurchase: false, reason: 'User not authenticated' };
    }

    // Get package
    const pkg = await getPackageById(packageId);
    if (!pkg) {
      return { canPurchase: false, reason: 'Package not found' };
    }

    // Check min/max investment
    if (amount < (pkg.min_investment || pkg.price)) {
      return {
        canPurchase: false,
        reason: `Minimum investment is ${pkg.min_investment || pkg.price}`,
      };
    }
    if (pkg.max_investment && amount > pkg.max_investment) {
      return {
        canPurchase: false,
        reason: `Maximum investment is ${pkg.max_investment}`,
      };
    }

    // Get wallet balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (userData.wallet_balance < amount) {
      return {
        canPurchase: false,
        reason: `Insufficient balance. You need ${amount - userData.wallet_balance} more.`,
      };
    }

    return { canPurchase: true };
  } catch (error: any) {
    console.error('Error checking purchase eligibility:', error);
    return { canPurchase: false, reason: error.message || 'Failed to verify eligibility' };
  }
};
