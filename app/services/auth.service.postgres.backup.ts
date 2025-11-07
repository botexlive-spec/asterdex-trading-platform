/**
 * Authentication Service - PostgreSQL Version
 * Replaces Supabase Auth with bcrypt + JWT
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.client';
import {
  User,
  LoginCredentials,
  AuthResponse,
} from '../types/auth.types';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'finaster_jwt_secret_key_change_in_production_2024';
const JWT_EXPIRES_IN = '7d';

/**
 * Sign in an existing user
 */
export const signIn = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('🔐 Attempting login for:', credentials.email);

    // Find user by email
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [credentials.email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check email verification (optional - can be disabled for testing)
    // if (!user.email_verified) {
    //   throw new Error('Please verify your email before logging in');
    // }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    console.log('✅ Login successful for:', user.email);

    return {
      user: userWithoutPassword as User,
      token,
      refreshToken: token, // Same as token for now
    };
  } catch (error: any) {
    console.error('❌ Sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Get the current authenticated user by token
 */
export const getCurrentUser = async (token: string): Promise<User | null> => {
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    // Fetch user from database
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true LIMIT 1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = result.rows[0];
    return userWithoutPassword as User;
  } catch (error: any) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  // For JWT, we just clear the client-side token
  // No server-side action needed
  console.log('🚪 User signed out');
};

/**
 * Hash password for registration
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): { id: string; email: string; role: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has a specific role
 */
export const hasRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT role FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].role === role;
  } catch (error) {
    return false;
  }
};

/**
 * Check if user is an admin
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  return hasRole(userId, 'admin');
};

// Export default object for compatibility
export default {
  signIn,
  getCurrentUser,
  signOut,
  hashPassword,
  verifyToken,
  hasRole,
  isAdmin,
};
