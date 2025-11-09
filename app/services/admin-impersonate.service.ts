
/**
 * Impersonate a user (admin only)
 * This allows admins to log in as another user to see their view
 */

/**
 * ⚠️  MIGRATION IN PROGRESS: MySQL Backend Integration
 * 
 * Some functions may return empty data or throw errors until backend
 * API endpoints are fully implemented.
 * 
 * Service: User impersonation
 * 
 * Next steps:
 * 1. Create backend API routes in server/routes/admin-impersonate.ts
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


export const impersonateUser = async (userId: string, reason?: string): Promise<{ success: boolean; error?: string; token?: string }> => {
  try {
    const result = await apiRequest(`/api/impersonate/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Admin support' }),
    });

    if (result.token) {
      // Store impersonation data in localStorage
      const impersonationData = {
        token: result.token,
        adminId: result.impersonatedBy,
        targetUserId: result.user.id,
        targetUserEmail: result.user.email,
        timestamp: new Date().toISOString(),
        expiresIn: result.expiresIn,
      };

      localStorage.setItem('impersonation', JSON.stringify(impersonationData));

      return { success: true, token: result.token };
    }

    return { success: false, error: 'No token received' };
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

      // Call backend to stop impersonation
      await apiRequest('/api/impersonate/stop', {
        method: 'POST',
        body: JSON.stringify({ userId: data.targetUserId }),
      });
    }

    // Clear impersonation data
    localStorage.removeItem('impersonation');

    return { success: true };
  } catch (error: any) {
    console.error('Stop impersonation error:', error);
    // Even if the API call fails, clear local storage
    localStorage.removeItem('impersonation');
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

    // Verify impersonation status with backend
    const result = await apiRequest('/api/impersonate/verify', {
      method: 'POST',
    });

    if (result.isImpersonating) {
      return result.user;
    }

    return null;
  } catch (error) {
    console.error('Get impersonated user data error:', error);
    return null;
  }
};
