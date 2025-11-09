/**
 * Authentication Service - API Client
 * Calls Express API instead of Supabase
 * Uses httpClient for automatic token refresh on 401 responses
 */

import {
  User,
  LoginCredentials,
  AuthResponse,
} from '../types/auth.types';
import { get, post } from '../utils/httpClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Sign in an existing user
 */
export const signIn = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('🔐 Calling API login for:', credentials.email);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();

    // Note: Token storage is handled by Login.tsx component
    // based on the "Remember me" checkbox (localStorage vs sessionStorage)

    console.log('✅ Login successful:', data.user.email);

    return data;
  } catch (error: any) {
    console.error('❌ Sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Get the current authenticated user
 * Uses httpClient for automatic token refresh on 401
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

    if (!token) {
      return null;
    }

    const data = await get<{ user: User }>('/api/auth/me');
    return data.user;
  } catch (error: any) {
    console.error('Get current user error:', error);
    // httpClient handles token cleanup on auth failure
    return null;
  }
};

/**
 * Sign up a new user (placeholder for future implementation)
 */
export const signUp = async (credentials: any): Promise<AuthResponse> => {
  // TODO: Implement registration endpoint
  throw new Error('Registration is not yet implemented. Please contact admin to create an account.');
};

/**
 * Sign out the current user
 * Revokes refresh token on backend
 */
export const signOut = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

    if (refreshToken) {
      // Send refresh token to revoke it on backend
      await post('/api/auth/logout', { refreshToken });
    }

    // Clear all auth data from storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');

    console.log('🚪 User signed out');
  } catch (error: any) {
    console.error('Sign out error:', error);
    // Clear both storages anyway
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
  }
};

/**
 * Check if user has a specific role
 */
export const hasRole = async (role: string): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    return user?.role === role;
  } catch (error) {
    return false;
  }
};

/**
 * Check if user is an admin
 */
export const isAdmin = async (): Promise<boolean> => {
  return hasRole('admin');
};

// Export default object for compatibility
export default {
  signIn,
  signUp,
  getCurrentUser,
  signOut,
  hasRole,
  isAdmin,
};
