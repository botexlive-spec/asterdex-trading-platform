/**
 * Admin Audit Service
 * Manages audit logs for admin actions, user actions, and system events
 */

import { requireAdmin } from '../middleware/admin.middleware';

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
        // Verify admin access
    await requireAdmin();

let query = supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin logs:', error);
      return [];
    }

    return data || [];
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
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('admin_actions')
      .insert([{
        action_type: actionType,
        target_id: targetId,
        details,
      }]);

    if (error) throw error;
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
        // Verify admin access
    await requireAdmin();

// This would query a user_activity_logs table if it exists
    // For now, we can get user-related data from mlm_transactions
    let query = supabase
      .from('mlm_transactions')
      .select(`
        id,
        user_id,
        transaction_type,
        amount,
        description,
        created_at,
        users!mlm_transactions_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }

    return data || [];
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
        // Verify admin access
    await requireAdmin();

// Get commission runs as system logs
    let query = supabase
      .from('commission_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching system logs:', error);
      return [];
    }

    return data || [];
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
        // Verify admin access
    await requireAdmin();

const [adminActions, transactions] = await Promise.all([
      supabase.from('admin_actions').select('*', { count: 'exact', head: true }),
      supabase.from('mlm_transactions').select('*', { count: 'exact', head: true }),
    ]);

    return {
      total_admin_actions: adminActions.count || 0,
      total_user_activities: transactions.count || 0,
      total_system_events: 0, // Would come from system_logs table
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
