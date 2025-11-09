/**
 * Rate Limiting Middleware
 * Prevents brute-force attacks and API abuse
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxAttempts: number;   // Maximum attempts in window
  identifier?: (req: Request) => string; // Custom identifier function
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 100
};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get identifier (IP address by default)
      const identifier = finalConfig.identifier
        ? finalConfig.identifier(req)
        : req.ip || req.connection.remoteAddress || 'unknown';

      const endpoint = `${req.method}:${req.path}`;
      const windowStart = new Date(Date.now() - finalConfig.windowMs);

      // Check existing rate limit
      const result = await query(
        `SELECT attempts, window_start
         FROM rate_limit_attempts
         WHERE identifier = ? AND endpoint = ?
         LIMIT 1`,
        [identifier, endpoint]
      );

      if (result.rows.length > 0) {
        const record = result.rows[0];
        const recordWindowStart = new Date(record.window_start);

        // If window expired, reset
        if (recordWindowStart < windowStart) {
          await query(
            `UPDATE rate_limit_attempts
             SET attempts = 1, window_start = NOW(), last_attempt = NOW()
             WHERE identifier = ? AND endpoint = ?`,
            [identifier, endpoint]
          );
          return next();
        }

        // If within window, check limit
        if (record.attempts >= finalConfig.maxAttempts) {
          const resetTime = new Date(recordWindowStart.getTime() + finalConfig.windowMs);
          res.setHeader('X-RateLimit-Limit', String(finalConfig.maxAttempts));
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime.getTime() / 1000)));

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
            retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
          });
        }

        // Increment attempts
        await query(
          `UPDATE rate_limit_attempts
           SET attempts = attempts + 1, last_attempt = NOW()
           WHERE identifier = ? AND endpoint = ?`,
          [identifier, endpoint]
        );

        res.setHeader('X-RateLimit-Limit', String(finalConfig.maxAttempts));
        res.setHeader('X-RateLimit-Remaining', String(finalConfig.maxAttempts - record.attempts - 1));

      } else {
        // First request, create record
        await query(
          `INSERT INTO rate_limit_attempts (identifier, endpoint, attempts, window_start)
           VALUES (?, ?, 1, NOW())
           ON DUPLICATE KEY UPDATE attempts = 1, window_start = NOW(), last_attempt = NOW()`,
          [identifier, endpoint]
        );

        res.setHeader('X-RateLimit-Limit', String(finalConfig.maxAttempts));
        res.setHeader('X-RateLimit-Remaining', String(finalConfig.maxAttempts - 1));
      }

      next();
    } catch (error) {
      console.error('❌ Rate limiter error:', error);
      // Don't block requests on rate limiter errors
      next();
    }
  };
}

/**
 * Aggressive rate limiter for auth endpoints (5 attempts per 15 min)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  identifier: (req) => {
    const email = req.body.email || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${email}:${ip}`;
  }
});

/**
 * Standard API rate limiter (100 requests per 15 min)
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 100
});

/**
 * Cleanup old rate limit records (call via cron)
 */
export async function cleanupRateLimitRecords() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await query(
      'DELETE FROM rate_limit_attempts WHERE window_start < ?',
      [oneDayAgo]
    );
    console.log(`✅ Cleaned up ${result.affectedRows} old rate limit records`);
  } catch (error) {
    console.error('❌ Error cleaning rate limit records:', error);
  }
}
