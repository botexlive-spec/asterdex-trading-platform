
/**
 * Impersonate a user (admin only)
 * This allows admins to log in as another user to see their view
 */
export const impersonateUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get the target user's email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Store impersonation data in localStorage
    // We store the admin's ID so we can restore their session later
    const impersonationData = {
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('impersonation', JSON.stringify(impersonationData));

    // Log the impersonation action
    await supabase.from('admin_actions').insert({
      admin_id: currentUser.id,
      action_type: 'impersonate_user',
      target_user_id: userId,
      details: {
        target_email: targetUser.email,
        target_name: targetUser.full_name
      },
      ip_address: 'system', // You can get real IP if needed
      user_agent: navigator.userAgent
    });

    // Instead of actually signing in as the user (which requires their credentials),
    // we'll set a flag that the app can use to fetch and display the target user's data
    // while maintaining the admin's session

    return { success: true };
  } catch (error: any) {
    console.error('Impersonate user error:', error);
    return { success: false, error: error.message || 'Failed to impersonate user' };
  }
};

/**
 * Stop impersonating and return to admin view
 */
export const stopImpersonation = async (): Promise<{ success: boolean }> => {
  try {
    const impersonationData = localStorage.getItem('impersonation');

    if (impersonationData) {
      const data = JSON.parse(impersonationData);

      // Log the end of impersonation
      await supabase.from('admin_actions').insert({
        admin_id: data.adminId,
        action_type: 'stop_impersonate',
        target_user_id: data.targetUserId,
        details: {
          duration_seconds: Math.floor((new Date().getTime() - new Date(data.timestamp).getTime()) / 1000)
        },
        ip_address: 'system',
        user_agent: navigator.userAgent
      });
    }

    // Clear impersonation data
    localStorage.removeItem('impersonation');

    return { success: true };
  } catch (error: any) {
    console.error('Stop impersonation error:', error);
    return { success: false };
  }
};

/**
 * Check if currently impersonating a user
 */
export const getImpersonationStatus = (): {
  isImpersonating: boolean;
  adminId?: string;
  targetUserId?: string;
  targetUserEmail?: string;
} => {
  try {
    const impersonationData = localStorage.getItem('impersonation');

    if (!impersonationData) {
      return { isImpersonating: false };
    }

    const data = JSON.parse(impersonationData);

    return {
      isImpersonating: true,
      adminId: data.adminId,
      targetUserId: data.targetUserId,
      targetUserEmail: data.targetUserEmail
    };
  } catch (error) {
    return { isImpersonating: false };
  }
};

/**
 * Get user data for impersonation (can be used to override current user context)
 */
export const getImpersonatedUserData = async () => {
  try {
    const impersonationStatus = getImpersonationStatus();

    if (!impersonationStatus.isImpersonating || !impersonationStatus.targetUserId) {
      return null;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', impersonationStatus.targetUserId)
      .single();

    if (error) {
      console.error('Error fetching impersonated user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get impersonated user data error:', error);
    return null;
  }
};
