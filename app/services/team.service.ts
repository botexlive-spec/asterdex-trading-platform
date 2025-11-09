/**
 * Team Service - MySQL Backend API
 * Handles all team/referral operations using MySQL backend
 */

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  sponsor_id: string;
  referral_code: string;
  wallet_balance: number;
  total_earnings: number;
  total_investment: number;
  roi_earnings: number;
  commission_earnings: number;
  binary_earnings: number;
  current_rank: string;
  left_volume: number;
  right_volume: number;
  phone_number: string | null;
  country: string | null;
  kyc_status: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  level: number;
}

export interface LevelStats {
  level: number;
  count: number;
  active: number;
  inactive: number;
  total_investment: number;
  total_earnings: number;
}

export interface TeamSummary {
  direct_members: number;
  total_team: number;
  total_active: number;
  total_inactive: number;
  total_investment: number;
  total_earnings: number;
  max_depth: number;
}

export interface TeamResponse {
  success: boolean;
  summary: TeamSummary;
  levels: LevelStats[];
  members: TeamMember[];
}

/**
 * Get API base URL
 */
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

/**
 * Get authentication token
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

/**
 * Make authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  const url = `${getApiUrl()}${endpoint}`;

  console.log(`🌐 [Team Service] ${options.method || 'GET'} ${endpoint}`);

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
    const errorMessage = errorData.error || `API request failed: ${response.status}`;
    console.error(`❌ [Team Service] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`✅ [Team Service] Response received`);
  return data;
}

/**
 * Get all team members with level-wise breakdown
 * Uses MySQL backend API with recursive CTE (up to 30 levels)
 */
export async function getTeamMembers(): Promise<TeamResponse> {
  try {
    console.log('🔍 [Team Service] Fetching team members from MySQL API...');
    const startTime = Date.now();

    const data = await apiRequest<TeamResponse>('/team/members');

    const loadTime = Date.now() - startTime;
    console.log(`✅ [Team Service] Loaded ${data.summary.total_team} members in ${loadTime}ms`);
    console.log(`📊 [Team Service] Direct: ${data.summary.direct_members}, Total: ${data.summary.total_team}, Levels: ${data.summary.max_depth}`);

    return data;
  } catch (error: any) {
    console.error('❌ [Team Service] Error fetching team members:', error);
    throw new Error(error.message || 'Failed to fetch team members');
  }
}

/**
 * Get only direct referrals (Level 1)
 */
export async function getDirectReferrals(): Promise<TeamMember[]> {
  try {
    console.log('🔍 [Team Service] Fetching direct referrals...');

    const data = await apiRequest<{ success: boolean; count: number; members: TeamMember[] }>('/team/direct');

    console.log(`✅ [Team Service] Found ${data.count} direct referrals`);
    return data.members;
  } catch (error: any) {
    console.error('❌ [Team Service] Error fetching direct referrals:', error);
    throw new Error(error.message || 'Failed to fetch direct referrals');
  }
}

/**
 * Get team statistics summary
 */
export async function getTeamStats(): Promise<{ direct_members: number; total_team: number; team_investment: number }> {
  try {
    console.log('🔍 [Team Service] Fetching team stats...');

    const data = await apiRequest<{
      success: boolean;
      direct_members: number;
      total_team: number;
      team_investment: number;
    }>('/team/stats');

    console.log(`✅ [Team Service] Stats loaded - Direct: ${data.direct_members}, Total: ${data.total_team}`);
    return data;
  } catch (error: any) {
    console.error('❌ [Team Service] Error fetching team stats:', error);
    throw new Error(error.message || 'Failed to fetch team stats');
  }
}

/**
 * Get members at a specific level
 */
export async function getTeamMembersByLevel(level: number): Promise<TeamMember[]> {
  try {
    if (level < 1 || level > 30) {
      throw new Error('Level must be between 1 and 30');
    }

    console.log(`🔍 [Team Service] Fetching level ${level} members...`);

    const data = await apiRequest<{
      success: boolean;
      level: number;
      count: number;
      members: TeamMember[];
    }>(`/api/team/level/${level}`);

    console.log(`✅ [Team Service] Found ${data.count} members at level ${level}`);
    return data.members;
  } catch (error: any) {
    console.error(`❌ [Team Service] Error fetching level ${level} members:`, error);
    throw new Error(error.message || `Failed to fetch level ${level} members`);
  }
}

/**
 * Format team member data for display
 */
export function formatTeamMember(member: TeamMember) {
  return {
    id: member.id,
    name: member.full_name || member.email,
    email: member.email,
    joinDate: member.created_at,
    level: member.level,
    status: member.is_active ? 'active' : 'inactive',
    investment: member.total_investment,
    totalInvestment: member.total_investment,
    earnings: member.total_earnings,
    roiEarnings: member.roi_earnings,
    commissionEarnings: member.commission_earnings,
    binaryEarnings: member.binary_earnings,
    balance: member.wallet_balance,
    rank: member.current_rank,
    referralCode: member.referral_code,
    kycStatus: member.kyc_status,
    emailVerified: member.email_verified,
    sponsorId: member.sponsor_id,
    leftVolume: member.left_volume,
    rightVolume: member.right_volume,
  };
}

/**
 * Export team report as CSV
 */
export async function exportTeamReport(level?: number): Promise<string> {
  try {
    let members: TeamMember[];

    if (level) {
      members = await getTeamMembersByLevel(level);
    } else {
      const data = await getTeamMembers();
      members = data.members;
    }

    // Generate CSV
    const headers = [
      'Level',
      'Name',
      'Email',
      'Join Date',
      'Investment',
      'Earnings',
      'Balance',
      'Rank',
      'Status',
      'KYC',
      'Referral Code',
    ];

    const rows = members.map((m) => [
      m.level,
      m.full_name,
      m.email,
      new Date(m.created_at).toLocaleDateString(),
      `$${m.total_investment.toFixed(2)}`,
      `$${m.total_earnings.toFixed(2)}`,
      `$${m.wallet_balance.toFixed(2)}`,
      m.current_rank,
      m.is_active ? 'Active' : 'Inactive',
      m.kyc_status,
      m.referral_code,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    console.log(`✅ [Team Service] Exported ${members.length} members to CSV`);
    return csv;
  } catch (error: any) {
    console.error('❌ [Team Service] Error exporting team report:', error);
    throw new Error(error.message || 'Failed to export team report');
  }
}
