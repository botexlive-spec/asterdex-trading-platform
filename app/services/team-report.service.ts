/**
 * Team Report Service - MySQL Backend API
 * Handles team structure reporting with level-wise breakdown
 * Distinguishes between Direct Members (Level 1) and Total Team (All Levels)
 * NO SUPABASE - Pure MySQL API
 */

import * as teamService from './team.service';

export interface TeamMemberDetail {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  total_investment: number;
  wallet_balance: number;
  is_active: boolean;
  current_rank: string;
  kyc_status: string;
  sponsor_id: string;
  sponsor_name?: string;
  direct_count: number;
  team_count: number;
  level: number;
}

export interface LevelStats {
  level: number;
  member_count: number;
  percentage: number;
  total_investment: number;
  total_balance: number;
  active_count: number;
  inactive_count: number;
  members?: TeamMemberDetail[];
}

export interface TeamReportData {
  direct_members_count: number;
  total_team_count: number;
  total_investment: number;
  total_balance: number;
  levels: LevelStats[];
  max_depth: number;
}

/**
 * Get comprehensive team report with level-wise breakdown
 * Uses MySQL backend API (same data source as "My Team")
 */
export const getTeamReport = async (): Promise<TeamReportData> => {
  try {
    console.log('📊 [Team Report] Fetching team data from MySQL API...');
    const startTime = Date.now();

    // Get all team members from MySQL API
    const teamData = await teamService.getTeamMembers();

    const loadTime = Date.now() - startTime;
    console.log(`✅ [Team Report] Data loaded in ${loadTime}ms`);

    // Build level stats from the data
    const levels: LevelStats[] = teamData.levels.map((levelData) => ({
      level: levelData.level,
      member_count: levelData.count,
      percentage: teamData.summary.total_team > 0
        ? (levelData.count / teamData.summary.total_team) * 100
        : 0,
      total_investment: levelData.total_investment,
      total_balance: levelData.total_earnings, // Using earnings as balance proxy
      active_count: levelData.active,
      inactive_count: levelData.inactive,
    }));

    const report: TeamReportData = {
      direct_members_count: teamData.summary.direct_members,
      total_team_count: teamData.summary.total_team,
      total_investment: teamData.summary.total_investment,
      total_balance: teamData.summary.total_earnings,
      levels,
      max_depth: teamData.summary.max_depth,
    };

    console.log(`✅ [Team Report] Built report:`, {
      direct: report.direct_members_count,
      total: report.total_team_count,
      levels: report.max_depth,
    });

    return report;
  } catch (error: any) {
    console.error('❌ [Team Report] Error generating report:', error);
    throw new Error(error.message || 'Failed to generate team report');
  }
};

/**
 * Get detailed members for a specific level
 * Uses MySQL backend API
 */
export const getLevelMembers = async (level: number): Promise<TeamMemberDetail[]> => {
  try {
    console.log(`📋 [Team Report] Fetching level ${level} members...`);

    const members = await teamService.getTeamMembersByLevel(level);

    // Convert to TeamMemberDetail format
    const detailedMembers: TeamMemberDetail[] = members.map((member) => ({
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      created_at: member.created_at,
      total_investment: member.total_investment,
      wallet_balance: member.wallet_balance,
      is_active: member.is_active,
      current_rank: member.current_rank,
      kyc_status: member.kyc_status,
      sponsor_id: member.sponsor_id,
      direct_count: 0, // Not calculated per member in this view
      team_count: 0, // Not calculated per member in this view
      level: member.level,
    }));

    console.log(`✅ [Team Report] Found ${detailedMembers.length} members at level ${level}`);
    return detailedMembers;
  } catch (error: any) {
    console.error(`❌ [Team Report] Error fetching level ${level} members:`, error);
    throw new Error(error.message || `Failed to fetch level ${level} members`);
  }
};

/**
 * Get direct members (Level 1 only)
 */
export const getDirectMembers = async (): Promise<TeamMemberDetail[]> => {
  try {
    console.log('📋 [Team Report] Fetching direct members...');

    const members = await teamService.getDirectReferrals();

    const detailedMembers: TeamMemberDetail[] = members.map((member) => ({
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      created_at: member.created_at,
      total_investment: member.total_investment,
      wallet_balance: member.wallet_balance,
      is_active: member.is_active,
      current_rank: member.current_rank,
      kyc_status: member.kyc_status,
      sponsor_id: member.sponsor_id,
      direct_count: 0,
      team_count: 0,
      level: 1,
    }));

    console.log(`✅ [Team Report] Found ${detailedMembers.length} direct members`);
    return detailedMembers;
  } catch (error: any) {
    console.error('❌ [Team Report] Error fetching direct members:', error);
    throw new Error(error.message || 'Failed to fetch direct members');
  }
};

/**
 * Export team report data for a specific level
 */
export const exportLevelReport = async (level: number): Promise<string> => {
  try {
    console.log(`📥 [Team Report] Exporting level ${level} report...`);

    const csv = await teamService.exportTeamReport(level);

    console.log(`✅ [Team Report] Export complete`);
    return csv;
  } catch (error: any) {
    console.error(`❌ [Team Report] Error exporting level ${level} report:`, error);
    throw new Error(error.message || `Failed to export level ${level} report`);
  }
};
