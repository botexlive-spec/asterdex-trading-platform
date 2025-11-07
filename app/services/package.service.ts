/**
 * Package Service
 * Handles all package-related operations using MySQL backend API
 * Migrated from Supabase to Express/MySQL backend
 */

import apiClient from '../utils/api-client';
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
    console.log('🔍 Fetching available packages from backend...');

    const response = await apiClient.get<{ packages: any[] }>('/packages');

    if (response.error) {
      console.error('❌ Error fetching packages:', response.error);
      throw new Error(response.error);
    }

    const packages = response.data?.packages || [];
    console.log(`✅ Found ${packages.length} active packages`);

    // Calculate return values for each package
    const packagesWithCalculations = packages.map((pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      min_investment: pkg.min_investment,
      max_investment: pkg.max_investment,
      daily_return_percentage: pkg.daily_roi_percentage,
      max_return_percentage: 200, // 200% total return (2x investment)
      duration_days: pkg.duration_days,
      level_income_percentages: pkg.level_income_percentages || [],
      matching_bonus_percentage: pkg.matching_bonus_percentage,
      is_active: pkg.is_active,
      price: pkg.min_investment, // For compatibility
      daily_return: (pkg.min_investment * pkg.daily_roi_percentage) / 100,
      total_return: pkg.min_investment * 2, // 200% return
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
    const packages = await getAvailablePackages();
    const pkg = packages.find(p => p.id === packageId);

    if (!pkg) return null;

    return pkg;
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
    console.log('🛒 Purchasing package:', request);

    // Call backend API to purchase package
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      package: any;
    }>('/packages/purchase', {
      package_id: request.package_id,
      investment_amount: request.amount,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const result = response.data!;

    console.log('✅ Package purchased successfully');

    // Map backend response to frontend format
    return {
      user_package: {
        id: result.package.name, // Use name as temporary ID
        user_id: '', // Backend doesn't return this
        package_id: request.package_id,
        package: result.package,
        amount_invested: result.package.investment_amount,
        start_date: new Date().toISOString(),
        end_date: result.package.expiry_date,
        daily_return: result.package.daily_roi,
        total_return: result.package.total_roi_limit,
        claimed_return: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      transaction_id: 'tx_' + Date.now(), // Backend doesn't return transaction ID
      message: result.message,
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
    console.log('🔍 Fetching user packages...');

    const response = await apiClient.get<{ packages: any[] }>('/packages/my-packages');

    if (response.error) {
      throw new Error(response.error);
    }

    const packages = response.data?.packages || [];
    console.log(`✅ Found ${packages.length} user packages`);

    // Map backend format to frontend format
    const mappedPackages = packages.map((pkg: any) => ({
      id: pkg.id,
      user_id: '', // Backend doesn't return this
      package_id: pkg.package_id || '',
      package: {
        id: pkg.package_id || '',
        name: pkg.package_name,
        price: pkg.investment_amount,
        daily_return_percentage: (pkg.daily_roi_amount / pkg.investment_amount) * 100,
        duration_days: pkg.days_remaining || 0,
      },
      amount_invested: pkg.investment_amount,
      start_date: pkg.activation_date,
      end_date: pkg.expiry_date,
      daily_return: pkg.daily_roi_amount,
      total_return: pkg.total_roi_limit,
      claimed_return: pkg.total_roi_earned,
      last_claim_date: null, // Backend doesn't track this
      status: pkg.status,
      created_at: pkg.activation_date,
      updated_at: pkg.activation_date,
    }));

    // Filter by status if provided
    if (status) {
      return mappedPackages.filter(pkg => pkg.status === status);
    }

    return mappedPackages;
  } catch (error: any) {
    console.error('Error fetching user packages:', error);
    throw new Error(error.message || 'Failed to load your packages');
  }
};

/**
 * Calculate available returns to claim for a user package
 * This is client-side calculation based on the last claim date
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
 * NOTE: This endpoint needs to be added to the backend
 */
export const claimPackageReturns = async (
  request: PackageClaimRequest
): Promise<PackageClaimResponse> => {
  try {
    console.log('💰 Claiming package returns:', request);

    // TODO: Backend endpoint needed: POST /api/packages/claim-returns
    // For now, return error message
    throw new Error('Claim returns feature is not yet implemented in backend. Please contact support.');

    /* When backend endpoint is ready, uncomment this:
    const response = await apiClient.post<{
      claimed_amount: number;
      transaction_id: string;
      new_wallet_balance: number;
    }>('/packages/claim-returns', {
      user_package_id: request.user_package_id,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
    */
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
    console.log('📊 Calculating package stats...');

    // Get all user packages
    const packages = await getUserPackages();

    // Calculate stats
    const stats: PackageStats = {
      total_invested: 0,
      active_packages: 0,
      total_earned: 0,
      available_to_claim: 0,
    };

    packages.forEach((pkg: UserPackage) => {
      stats.total_invested += pkg.amount_invested;

      if (pkg.status === 'active') {
        stats.active_packages++;
        stats.available_to_claim += calculateAvailableReturns(pkg);
      }

      stats.total_earned += pkg.claimed_return;
    });

    console.log('✅ Package stats calculated:', stats);
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
    // Get all packages and return top 3
    const packages = await getAvailablePackages();
    return packages.slice(0, 3);
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

    // Get wallet balance from dashboard API
    const dashboardResponse = await apiClient.get<{ user: { wallet_balance: number } }>('/dashboard');

    if (dashboardResponse.error) {
      return { canPurchase: false, reason: 'Failed to verify balance' };
    }

    const walletBalance = dashboardResponse.data?.user?.wallet_balance || 0;

    if (walletBalance < amount) {
      return {
        canPurchase: false,
        reason: `Insufficient balance. You need ${amount - walletBalance} more.`,
      };
    }

    return { canPurchase: true };
  } catch (error: any) {
    console.error('Error checking purchase eligibility:', error);
    return { canPurchase: false, reason: error.message || 'Failed to verify eligibility' };
  }
};
