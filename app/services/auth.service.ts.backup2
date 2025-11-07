/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { supabase } from './supabase.client';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  PasswordResetRequest,
  UpdateProfileData,
  ChangePasswordData,
} from '../types/auth.types';

/**
 * Sign up a new user with complete MLM onboarding
 */
export const signUp = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    // Import MLM service dynamically to avoid circular dependency
    const { completeMlmOnboarding, validateReferralCode } = await import('./mlm.service');

    // Validate referral code if provided
    let sponsorId: string | undefined;
    if (data.referral_code) {
      const validation = await validateReferralCode(data.referral_code);
      if (validation.valid && validation.userId) {
        sponsorId = validation.userId;
      } else {
        throw new Error('Invalid referral code');
      }
    }

    // Create auth user
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          wallet_address: data.wallet_address,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) throw error;
    if (!authData.user) throw new Error('User creation failed');

    const userId = authData.user.id;

    // Wait for database trigger to create user profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Complete MLM onboarding (referral code, binary tree, wallet init)
    await completeMlmOnboarding(userId, sponsorId);

    // Fetch the complete user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // If user profile doesn't exist yet, return minimal user object
    if (userError || !userData) {
      console.warn('User profile not yet created in users table:', userError?.message);

      return {
        user: {
          id: userId,
          email: authData.user.email || data.email,
          full_name: data.full_name,
          created_at: authData.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User,
        token: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token,
      };
    }

    return {
      user: userData as User,
      token: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(error.message || 'Failed to sign up');
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Login failed');

    // Fetch the full user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw userError;

    return {
      user: userData as User,
      token: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token,
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) return null;

    // Fetch the full user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      return null;
    }

    return userData as User;
  } catch (error: any) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Request a password reset email
 */
export const requestPasswordReset = async (data: PasswordResetRequest): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Password reset request error:', error);
    throw new Error(error.message || 'Failed to request password reset');
  }
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Update password error:', error);
    throw new Error(error.message || 'Failed to update password');
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        wallet_address: data.wallet_address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return userData as User;
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

/**
 * Change user password (requires current password)
 */
export const changePassword = async (data: ChangePasswordData): Promise<void> => {
  try {
    // First, verify current password by attempting to sign in
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: data.currentPassword,
    });

    if (signInError) throw new Error('Current password is incorrect');

    // Update to new password
    await updatePassword(data.newPassword);
  } catch (error: any) {
    console.error('Change password error:', error);
    throw new Error(error.message || 'Failed to change password');
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (token: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Verify email error:', error);
    throw new Error(error.message || 'Failed to verify email');
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (): Promise<void> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
    });

    if (error) throw error;
  } catch (error: any) {
    console.error('Resend verification email error:', error);
    throw new Error(error.message || 'Failed to resend verification email');
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
