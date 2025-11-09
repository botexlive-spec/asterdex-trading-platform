import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, AuthState, LoginCredentials, AuthResponse } from '../types/auth.types';
import toast from 'react-hot-toast';
import * as authService from '../services/auth.service';
import { setAuthContextRef } from '../middleware/admin.middleware';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isUser: boolean;
  hasPermission: (permission: string) => boolean;
  checkAuth: () => void;
  isImpersonating: boolean;
  actualUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [actualUser, setActualUser] = useState<User | null>(null);
  const isCheckingAuth = useRef(false);

  // Create a ref that holds the current context value for middleware access
  const contextValueRef = useRef<AuthContextType | null>(null);

  // Load auth state from localStorage on mount - NO DEPENDENCIES to prevent loops
  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingAuth.current) {
      console.log('⏭️ Skipping checkAuth - already in progress');
      return;
    }

    isCheckingAuth.current = true;

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

      if (token && userStr) {
        console.log('✅ Found stored auth token, verifying...');
        const user = JSON.parse(userStr) as User;

        // Check for impersonation
        const impersonationStr = localStorage.getItem('impersonation');
        if (impersonationStr) {
          try {
            const impersonationData = JSON.parse(impersonationStr);
            if (impersonationData.isImpersonating && impersonationData.actualUser) {
              setActualUser(impersonationData.actualUser);
              setIsImpersonating(true);
              console.log('👥 Impersonation mode detected');
            }
          } catch (e) {
            console.error('Failed to parse impersonation data:', e);
          }
        }

        // Set auth state
        setAuthState({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        console.log('ℹ️ No stored auth credentials');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      // Clear potentially corrupt data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } finally {
      isCheckingAuth.current = false;
    }
  }, []); // EMPTY DEPS - only runs once on mount

  useEffect(() => {
    console.log('🔐 AuthProvider mounted - checking auth');
    checkAuth();
  }, []); // EMPTY DEPS - only runs once on mount

  const login = async (email: string, password: string) => {
    // Prevent multiple simultaneous login requests
    if (authState.isLoading) {
      console.log('⏭️ Login already in progress, skipping...');
      return;
    }

    try {
      console.log('🔐 Starting login for:', email);
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Call REAL API using auth.service.ts
      const response: AuthResponse = await authService.signIn({ email, password });

      console.log('✅ API login successful:', response.user.email, 'Role:', response.user.role);

      // Save tokens and user to localStorage
      // Note: accessToken is short-lived (15min), refreshToken is long-lived (7days)
      localStorage.setItem('auth_token', response.accessToken || response.token);
      localStorage.setItem('refresh_token', response.refreshToken || response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setAuthState({
        user: response.user,
        token: response.accessToken || response.token,
        refreshToken: response.refreshToken || response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success(`Welcome ${response.user.fullName || response.user.full_name || response.user.email}!`);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error.message || 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');

      // Call API logout endpoint
      await authService.signOut();

      // Clear all auth data from storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('impersonation');

      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user');

      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      setIsImpersonating(false);
      setActualUser(null);

      console.log('✅ Logout complete');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local data even if API call fails
      localStorage.clear();
      sessionStorage.clear();
      toast.error('Logout failed, but local session cleared');
    }
  }, []);

  // When impersonating, actualUser holds the admin, authState.user holds the impersonated user
  // So we check actualUser for admin status when impersonating
  const isAdmin = isImpersonating
    ? (actualUser?.role === UserRole.ADMIN || actualUser?.role === 'admin')
    : (authState.user?.role === UserRole.ADMIN || authState.user?.role === 'admin');

  const isUser = authState.user?.role === UserRole.USER || authState.user?.role === 'user';

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;
    // When impersonating, check actual admin user for permissions
    if (isImpersonating && actualUser) {
      return actualUser.role === UserRole.ADMIN || actualUser.role === 'admin';
    }
    if (isAdmin) return true; // Admin has all permissions

    // Add your permission logic here based on user role
    // Example: if (permission === 'create:package' && isUser) return true;

    return false;
  };

  // Build the context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    isAdmin,
    isUser,
    hasPermission,
    checkAuth,
    isImpersonating,
    actualUser,
  };

  // Update the ref and notify middleware whenever context value changes
  useEffect(() => {
    contextValueRef.current = contextValue;
    setAuthContextRef(contextValue);
    console.log('🔄 [AuthContext] Context updated:', {
      isAuthenticated: contextValue.isAuthenticated,
      userEmail: contextValue.user?.email,
      userRole: contextValue.user?.role
    });
  }, [contextValue.isAuthenticated, contextValue.user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
