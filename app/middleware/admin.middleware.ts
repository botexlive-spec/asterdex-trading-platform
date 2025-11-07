/**
 * Admin Authorization Middleware
 * Provides role-based access control for admin endpoints
 *
 * NOTE: This middleware is CLIENT-SIDE only and does NOT provide real security.
 * All API endpoints must validate admin access on the backend.
 */

// Store a reference to AuthContext that can be set by the app
let authContextRef: any = null;

/**
 * Set auth context reference (called by AuthProvider on mount)
 * @internal
 */
export const setAuthContextRef = (context: any) => {
  authContextRef = context;
};

/**
 * Get current user - tries AuthContext first, falls back to localStorage
 */
const getCurrentUser = (): { id: string; email: string; role: string } | null => {
  // PRIORITY 1: Try to get from AuthContext (most reliable, current state)
  if (authContextRef && authContextRef.user) {
    console.log('✅ [Admin Middleware] Using user from AuthContext:', {
      email: authContextRef.user.email,
      role: authContextRef.user.role
    });
    return authContextRef.user;
  }

  // PRIORITY 2: Fall back to localStorage
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

  console.log('🔍 [Admin Middleware] Checking localStorage (AuthContext not available):', {
    hasToken: !!token,
    hasUserStr: !!userStr
  });

  if (!token || !userStr) {
    console.warn('❌ [Admin Middleware] No auth data found');
    return null;
  }

  try {
    const user = JSON.parse(userStr);
    console.log('✅ [Admin Middleware] Parsed user from localStorage:', {
      email: user.email,
      role: user.role,
      hasRole: 'role' in user
    });
    return user;
  } catch (error) {
    console.error('❌ [Admin Middleware] Error parsing user data:', error);
    return null;
  }
};

/**
 * Verify that the current user has admin privileges
 * @throws Error if user is not authenticated or not an admin
 */
export const requireAdmin = async (): Promise<void> => {
  console.log('🔐 [requireAdmin] Checking admin privileges...');

  const user = getCurrentUser();

  if (!user) {
    console.error('❌ [requireAdmin] No user found');
    throw new Error('User not authenticated');
  }

  // Normalize role to lowercase for comparison
  const userRole = (user.role || '').toLowerCase().trim();
  const allowedRoles = ['admin', 'superadmin'];

  console.log('🔍 [requireAdmin] Role check:', {
    email: user.email,
    userRole: userRole,
    allowedRoles: allowedRoles,
    matches: allowedRoles.includes(userRole)
  });

  // Allow both 'admin' and 'superadmin' roles (case-insensitive)
  if (!allowedRoles.includes(userRole)) {
    console.warn(`❌ [requireAdmin] Access denied for user ${user.email} with role: "${user.role}"`);
    throw new Error('Admin access required. Your account does not have admin privileges.');
  }

  console.log(`✅ [requireAdmin] Access granted for ${user.email} (role: ${user.role})`);
};

/**
 * Verify that the current user has superadmin privileges
 * @throws Error if user is not authenticated or not a superadmin
 */
export const requireSuperAdmin = async (): Promise<void> => {
  // Check authentication
  const user = getCurrentUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Only allow 'superadmin' role
  if (user.role !== 'superadmin') {
    console.warn(`Unauthorized superadmin access attempt by user ${user.email} with role: ${user.role}`);
    throw new Error('Superadmin access required. You do not have permission to perform this action.');
  }

  // Successfully verified as superadmin
  console.log(`Superadmin access granted for user ${user.email}`);
};

/**
 * Get the current authenticated user's role
 * @returns The user's role or null if not authenticated
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const user = getCurrentUser();
    return user ? user.role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Check if the current user is an admin (admin or superadmin)
 * @returns true if user is admin or superadmin, false otherwise
 */
export const isAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole();
  return role === 'admin' || role === 'superadmin';
};

/**
 * Check if the current user is a superadmin
 * @returns true if user is superadmin, false otherwise
 */
export const isSuperAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole();
  return role === 'superadmin';
};
