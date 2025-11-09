/**
 * Enhanced Authentication API Routes
 * - Short-lived access tokens (15 min)
 * - Long-lived refresh tokens (7 days)
 * - Rate limiting protection
 * - Failed attempt tracking
 * - Account lockout on brute force
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Generate access token
 */
function generateAccessToken(user: any): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user: any): string {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Record failed login attempt
 */
async function recordFailedAttempt(email: string, ip: string, userAgent: string) {
  await query(
    'INSERT INTO failed_login_attempts (email, ip_address, user_agent) VALUES (?, ?, ?)',
    [email, ip, userAgent]
  );
}

/**
 * Check if account is locked
 */
async function isAccountLocked(email: string): Promise<boolean> {
  const result = await query(
    `SELECT account_locked_until FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0 || !result.rows[0].account_locked_until) {
    return false;
  }

  const lockoutTime = new Date(result.rows[0].account_locked_until);
  return lockoutTime > new Date();
}

/**
 * Lock account after too many failed attempts
 */
async function lockAccount(email: string) {
  const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  await query(
    `UPDATE users SET account_locked_until = ?, failed_login_attempts = 0 WHERE email = ?`,
    [lockUntil, email]
  );
}

/**
 * POST /api/auth/login
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    console.log('🔐 Login attempt:', email);

    // Check if account is locked
    if (await isAccountLocked(email)) {
      await recordFailedAttempt(email, ip, userAgent);
      return res.status(403).json({
        error: 'Account temporarily locked due to multiple failed login attempts. Try again later.'
      });
    }

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      await recordFailedAttempt(email, ip, userAgent);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      await recordFailedAttempt(email, ip, userAgent);

      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      await query(
        'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
        [failedAttempts, user.id]
      );

      // Lock account if too many failures
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await lockAccount(email);
        return res.status(403).json({
          error: 'Too many failed login attempts. Account locked for 30 minutes.'
        });
      }

      return res.status(401).json({
        error: 'Invalid email or password',
        remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts
      });
    }

    // Successful login - reset failed attempts
    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           account_locked_until = NULL,
           last_login_at = NOW(),
           last_login_ip = ?
       WHERE id = ?`,
      [ip, user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, refreshToken, expiresAt]
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    console.log('✅ Login successful:', email);

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; type: string };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if token exists and not revoked
    const tokenResult = await query(
      `SELECT * FROM refresh_tokens WHERE token = ? AND is_revoked = FALSE LIMIT 1`,
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Get user
    const userResult = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
      expiresIn: 900
    });
  } catch (error: any) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await query(
        `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token = ?`,
        [refreshToken]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const result = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = true LIMIT 1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password_hash, ...userWithoutPassword } = result.rows[0];

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
