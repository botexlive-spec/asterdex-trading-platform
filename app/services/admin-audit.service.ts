/**
 * Admin Audit Service
 * Manages audit logs for admin actions, user actions, and system events
 */


/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: Audit logs
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-audit.ts
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


export interface AdminLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Get admin action logs
 */
export const getAdminLogs = async (
  filters?: {
    actionType?: string;
    dateFrom?: string;
    dateTo?: string;
    adminId?: string;
  },
  limit: number = 100
): Promise<AdminLog[]> => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    if (filters?.actionType) {
      params.append('action', filters.actionType);
    }

    if (filters?.dateFrom) {
      params.append('startDate', filters.dateFrom);
    }

    if (filters?.dateTo) {
      params.append('endDate', filters.dateTo);
    }

    if (filters?.adminId) {
      params.append('userId', filters.adminId);
    }

    const result = await apiRequest(`/api/audit/logs?${params.toString()}`);

    return (result.data || []).map((log: any) => ({
      id: log.id,
      admin_id: log.user_id,
      admin_name: log.user_meta?.full_name || log.user_email || 'Unknown',
      action_type: log.action,
      target_id: log.target_user_id,
      details: log.details,
      ip_address: null,
      user_agent: null,
      created_at: log.created_at,
    }));
  } catch (error: any) {
    console.error('Error getting admin logs:', error);
    return [];
  }
};

/**
 * Log admin action
 */
export const logAdminAction = async (
  actionType: string,
  targetId: string | null,
  details: any
): Promise<void> => {
  try {
    await apiRequest('/api/audit/log', {
      method: 'POST',
      body: JSON.stringify({
        action: actionType,
        targetUserId: targetId,
        details: typeof details === 'string' ? details : JSON.stringify(details),
      }),
    });
  } catch (error: any) {
    console.error('Error logging admin action:', error);
  }
};

/**
 * Get user activity logs
 */
export const getUserActivityLogs = async (
  userId?: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    if (userId) {
      const result = await apiRequest(`/api/audit/logs/${userId}?limit=${limit}`);
      return result.data || [];
    } else {
      const result = await apiRequest(`/api/audit/logs?limit=${limit}`);
      return result.data || [];
    }
  } catch (error: any) {
    console.error('Error getting user activity logs:', error);
    return [];
  }
};

/**
 * Get system logs
 */
export const getSystemLogs = async (
  filters?: {
    level?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  limit: number = 100
): Promise<any[]> => {
  try {
    // TODO: Implement backend API endpoint for system logs
    // Should fetch from /api/admin/system-logs or similar
    console.log('getSystemLogs: Placeholder - returning empty array');
    return [];
  } catch (error: any) {
    console.error('Error getting system logs:', error);
    return [];
  }
};

/**
 * Get audit statistics
 */
export const getAuditStats = async () => {
  try {
    const result = await apiRequest('/api/audit/stats');

    return {
      total_admin_actions: result.totalLogs || 0,
      total_user_activities: result.totalLogs || 0,
      total_system_events: 0,
      action_counts: result.actionCounts || {},
      top_users: result.topUsers || [],
      recent_activity_count: result.recentActivityCount || 0,
    };
  } catch (error: any) {
    console.error('Error getting audit stats:', error);
    return {
      total_admin_actions: 0,
      total_user_activities: 0,
      total_system_events: 0,
    };
  }
};
