/**
 * Admin Package Service - Complete MLM Package Management
 * Uses Express MySQL backend API
 */

import { requireAdmin } from '../middleware/admin.middleware';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Package {
  id: string;
  name: string;
  description?: string;
  price?: number;
  min_investment: number;
  max_investment: number;
  daily_roi_percentage: number;
  daily_return_percentage?: number; // alias for compatibility
  max_return_percentage?: number;
  duration_days: number;
  level_depth?: number;
  binary_bonus_percentage?: number;
  direct_commission_percentage?: number;
  binary_volume_multiplier?: number;
  features?: string[];
  status: 'active' | 'inactive';
  is_active?: boolean; // MySQL uses is_active
  is_popular?: boolean;
  sort_order?: number;
  image_url?: string;
  allow_multiple_purchases?: boolean;
  allow_upgrades?: boolean;
  auto_renewal?: boolean;
  min_rank_required?: string;
  kyc_required?: boolean;
  robot_required?: boolean;
  level_income_percentages?: string | any[]; // MySQL stores as JSON string
  matching_bonus_percentage?: number;
  created_at: string;
  updated_at?: string;
}

export interface PackageLevelCommission {
  id: string;
  package_id: string;
  level: number;
  commission_percentage: number;
}

export interface PackageFeature {
  id?: string;
  package_id?: string;
  feature_text: string;
  feature_icon?: string;
  display_order: number;
  is_highlighted: boolean;
}

export interface PackageAnalytics {
  package_id: string;
  total_purchases: number;
  total_active_users: number;
  total_expired_users: number;
  total_investment: number;
  total_roi_paid: number;
  average_investment: number;
  last_purchase_date: string;
}

export interface CreatePackageData {
  name: string;
  description?: string;
  price?: number;
  min_investment: number;
  max_investment: number;
  daily_roi_percentage: number;
  daily_return_percentage?: number;
  max_return_percentage?: number;
  duration_days: number;
  level_depth?: number;
  binary_bonus_percentage?: number;
  direct_commission_percentage?: number;
  binary_volume_multiplier?: number;
  features?: string[];
  is_popular?: boolean;
  image_url?: string;
  allow_multiple_purchases?: boolean;
  allow_upgrades?: boolean;
  auto_renewal?: boolean;
  min_rank_required?: string;
  kyc_required?: boolean;
  robot_required?: boolean;
  level_commissions?: { level: number; percentage: number }[];
  level_income_percentages?: any[];
  matching_bonus_percentage?: number;
  is_active?: boolean;
}

/**
 * Get API base URL
 */
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

/**
 * Get authentication token from storage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

/**
 * Make authenticated API request
 */
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  const url = `${getApiUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  return response.json();
};

// ============================================
// PACKAGE CRUD OPERATIONS
// ============================================

export async function getAllPackages(): Promise<Package[]> {
  try {
    await requireAdmin();
    const data = await apiRequest<{ packages: Package[] }>('/admin/packages');
    return data.packages || [];
  } catch (error: any) {
    console.error('Error getting all packages:', error);
    return [];
  }
}

export async function getActivePackages(): Promise<Package[]> {
  try {
    await requireAdmin();
    const allPackages = await getAllPackages();
    return allPackages.filter(pkg => pkg.is_active || pkg.status === 'active');
  } catch (error: any) {
    console.error('Error getting active packages:', error);
    return [];
  }
}

export async function getPackageById(id: string): Promise<Package | null> {
  try {
    await requireAdmin();
    const allPackages = await getAllPackages();
    return allPackages.find(pkg => pkg.id === id) || null;
  } catch (error: any) {
    console.error('Error getting package by ID:', error);
    return null;
  }
}

export async function createPackage(packageData: CreatePackageData): Promise<Package> {
  try {
    await requireAdmin();

    const payload = {
      name: packageData.name,
      min_investment: packageData.min_investment,
      max_investment: packageData.max_investment,
      daily_roi_percentage: packageData.daily_roi_percentage || packageData.daily_return_percentage,
      duration_days: packageData.duration_days,
      level_income_percentages: packageData.level_income_percentages || packageData.level_commissions || [],
      matching_bonus_percentage: packageData.matching_bonus_percentage || 0,
      is_active: packageData.is_active !== false,
    };

    await apiRequest('/admin/packages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Fetch updated packages list
    const packages = await getAllPackages();
    return packages[packages.length - 1]; // Return the newly created package
  } catch (error: any) {
    console.error('Error creating package:', error);
    throw error;
  }
}

export async function updatePackage(id: string, packageData: Partial<CreatePackageData>): Promise<Package> {
  try {
    await requireAdmin();

    const payload: any = {};

    if (packageData.name !== undefined) payload.name = packageData.name;
    if (packageData.min_investment !== undefined) payload.min_investment = packageData.min_investment;
    if (packageData.max_investment !== undefined) payload.max_investment = packageData.max_investment;
    if (packageData.daily_roi_percentage !== undefined) payload.daily_roi_percentage = packageData.daily_roi_percentage;
    if (packageData.daily_return_percentage !== undefined) payload.daily_roi_percentage = packageData.daily_return_percentage;
    if (packageData.duration_days !== undefined) payload.duration_days = packageData.duration_days;
    if (packageData.level_income_percentages !== undefined) payload.level_income_percentages = packageData.level_income_percentages;
    if (packageData.level_commissions !== undefined) payload.level_income_percentages = packageData.level_commissions;
    if (packageData.matching_bonus_percentage !== undefined) payload.matching_bonus_percentage = packageData.matching_bonus_percentage;
    if (packageData.is_active !== undefined) payload.is_active = packageData.is_active;

    await apiRequest(`/api/admin/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const updatedPackage = await getPackageById(id);
    if (!updatedPackage) throw new Error('Package not found after update');

    return updatedPackage;
  } catch (error: any) {
    console.error('Error updating package:', error);
    throw error;
  }
}

export async function deletePackage(id: string): Promise<void> {
  try {
    await requireAdmin();

    await apiRequest(`/api/admin/packages/${id}`, {
      method: 'DELETE',
    });

    console.log(`✅ Package ${id} deleted`);
  } catch (error: any) {
    console.error('Error deleting package:', error);
    throw error;
  }
}

export async function togglePackageStatus(id: string): Promise<Package> {
  try {
    await requireAdmin();

    // Get current package
    const pkg = await getPackageById(id);
    if (!pkg) throw new Error('Package not found');

    const newStatus = (pkg.is_active || pkg.status === 'active') ? false : true;

    await apiRequest(`/api/admin/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: newStatus }),
    });

    const updatedPackage = await getPackageById(id);
    if (!updatedPackage) throw new Error('Package not found after update');

    return updatedPackage;
  } catch (error: any) {
    console.error('Error toggling package status:', error);
    throw error;
  }
}

export async function reorderPackages(packageId: string, direction: 'up' | 'down'): Promise<void> {
  try {
    await requireAdmin();

    // Note: This requires backend support for reordering
    // For now, this is a stub implementation
    console.warn('Package reordering not yet implemented in backend');
    // TODO: Implement backend endpoint for package reordering
  } catch (error: any) {
    console.error('Error reordering packages:', error);
    throw error;
  }
}

// ============================================
// LEVEL COMMISSIONS
// ============================================

export async function getPackageLevelCommissions(packageId: string): Promise<PackageLevelCommission[]> {
  try {
    await requireAdmin();

    const pkg = await getPackageById(packageId);
    if (!pkg) return [];

    // Parse level_income_percentages from MySQL
    let percentages: any[] = [];
    if (typeof pkg.level_income_percentages === 'string') {
      try {
        percentages = JSON.parse(pkg.level_income_percentages);
      } catch (e) {
        percentages = [];
      }
    } else if (Array.isArray(pkg.level_income_percentages)) {
      percentages = pkg.level_income_percentages;
    }

    // Convert to PackageLevelCommission format
    return percentages.map((percentage, index) => ({
      id: `${packageId}-level-${index + 1}`,
      package_id: packageId,
      level: index + 1,
      commission_percentage: typeof percentage === 'number' ? percentage : parseFloat(percentage) || 0,
    }));
  } catch (error: any) {
    console.error('Error getting package level commissions:', error);
    return [];
  }
}

export async function setPackageLevelCommissions(
  packageId: string,
  commissions: { level: number; percentage: number }[]
): Promise<void> {
  try {
    await requireAdmin();

    const percentages = commissions.map(c => c.percentage);

    await apiRequest(`/api/admin/packages/${packageId}`, {
      method: 'PUT',
      body: JSON.stringify({ level_income_percentages: percentages }),
    });

    console.log(`✅ Package level commissions updated for ${packageId}`);
  } catch (error: any) {
    console.error('Error setting package level commissions:', error);
    throw error;
  }
}

// ============================================
// PACKAGE ANALYTICS
// ============================================

export async function getPackageAnalytics(packageId: string): Promise<PackageAnalytics | null> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package analytics
    console.warn('Package analytics not yet implemented');
    return null;
  } catch (error: any) {
    console.error('Error getting package analytics:', error);
    return null;
  }
}

export async function getAllPackagesAnalytics(): Promise<Map<string, PackageAnalytics>> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package analytics
    console.warn('Package analytics not yet implemented');
    return new Map();
  } catch (error: any) {
    console.error('Error getting all packages analytics:', error);
    return new Map();
  }
}

// ============================================
// PACKAGE FEATURES
// ============================================

export async function getPackageFeatures(packageId: string): Promise<PackageFeature[]> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package features
    console.warn('Package features not yet implemented');
    return [];
  } catch (error: any) {
    console.error('Error getting package features:', error);
    return [];
  }
}

export async function addPackageFeature(packageId: string, feature: Omit<PackageFeature, 'id' | 'package_id'>): Promise<PackageFeature> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package features
    console.warn('Package features not yet implemented');
    throw new Error('Not implemented');
  } catch (error: any) {
    console.error('Error adding package feature:', error);
    throw error;
  }
}

export async function updatePackageFeature(featureId: string, updates: Partial<PackageFeature>): Promise<PackageFeature> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package features
    console.warn('Package features not yet implemented');
    throw new Error('Not implemented');
  } catch (error: any) {
    console.error('Error updating package feature:', error);
    throw error;
  }
}

export async function deletePackageFeature(featureId: string): Promise<void> {
  try {
    await requireAdmin();

    // TODO: Implement backend endpoint for package features
    console.warn('Package features not yet implemented');
  } catch (error: any) {
    console.error('Error deleting package feature:', error);
    throw error;
  }
}
