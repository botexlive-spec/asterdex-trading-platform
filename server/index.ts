/**
 * Finaster MLM API Server
 * Express server with PostgreSQL backend
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import packagesRoutes from './routes/packages';
import adminRoutes from './routes/admin';
import teamRoutes from './routes/team';
import genealogyRoutes from './routes/genealogy';
import transactionsRoutes from './routes/transactions';
import ranksRoutes from './routes/ranks';
import walletRoutes from './routes/wallet';
import kycRoutes from './routes/kyc';
import userKycRoutes from './routes/user-kyc';
import supportRoutes from './routes/support';
import configRoutes from './routes/config';
import reportsRoutes from './routes/reports';
import reportsEnhancedRoutes from './routes/reports-enhanced';
import auditRoutes from './routes/audit';
import impersonateRoutes from './routes/impersonate';
import planSettingsRoutes from './routes/planSettings';
import boosterRoutes from './routes/booster';
import levelUnlocksRoutes from './routes/levelUnlocks';
import rewardsRoutes from './routes/rewards';
import binaryRoutes from './routes/binary';
import adminBinaryRoutes from './routes/admin-binary';
import adminCommunicationsRoutes from './routes/admin-communications';
import { pool, query } from './db';
import { distributeROI } from './cron/roi-distribution';
import { distributeEnhancedROI } from './cron/roi-distribution-v2';
import { runBinaryMatchingNow } from './cron/binary-matching';
import { expireBoostersDaily } from './services/booster.service';
import { calculateAllBusinessVolumes, distributeMonthlyRewards } from './services/rewards.service';

dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW() as now');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: String(error),
    });
  }
});

// API Routes
console.log('\n📡 Registering API Routes:');
app.use('/api/auth', authRoutes);
console.log('  ✅ /api/auth');
app.use('/api/dashboard', dashboardRoutes);
console.log('  ✅ /api/dashboard');
app.use('/api/packages', packagesRoutes);
console.log('  ✅ /api/packages');
app.use('/api/admin', adminRoutes);
console.log('  ✅ /api/admin (includes /analytics/overview, /users, /transactions, /analytics/revenue)');
app.use('/api/team', teamRoutes);
console.log('  ✅ /api/team');
app.use('/api/genealogy', genealogyRoutes);
console.log('  ✅ /api/genealogy');
app.use('/api/transactions', transactionsRoutes);
console.log('  ✅ /api/transactions');
app.use('/api/ranks', ranksRoutes);
console.log('  ✅ /api/ranks');
app.use('/api/wallet', walletRoutes);
console.log('  ✅ /api/wallet');
app.use('/api/kyc', kycRoutes);
console.log('  ✅ /api/kyc');
app.use('/api/user/kyc', userKycRoutes);
console.log('  ✅ /api/user/kyc');
app.use('/api/support', supportRoutes);
console.log('  ✅ /api/support');
app.use('/api/config', configRoutes);
console.log('  ✅ /api/config');
app.use('/api/reports', reportsRoutes);
console.log('  ✅ /api/reports');
app.use('/api/reports-enhanced', reportsEnhancedRoutes);
console.log('  ✅ /api/reports-enhanced');
app.use('/api/audit', auditRoutes);
console.log('  ✅ /api/audit');
app.use('/api/impersonate', impersonateRoutes);
console.log('  ✅ /api/impersonate');
app.use('/api/plan-settings', planSettingsRoutes);
console.log('  ✅ /api/plan-settings');
app.use('/api/booster', boosterRoutes);
console.log('  ✅ /api/booster');
app.use('/api/level-unlocks', levelUnlocksRoutes);
console.log('  ✅ /api/level-unlocks');
app.use('/api/rewards', rewardsRoutes);
console.log('  ✅ /api/rewards');
app.use('/api/binary', binaryRoutes);
console.log('  ✅ /api/binary');
app.use('/api/admin/binary', adminBinaryRoutes);
console.log('  ✅ /api/admin/binary');
app.use('/api/admin/communications', adminCommunicationsRoutes);
console.log('  ✅ /api/admin/communications\n');

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Finaster MLM API Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`💾 Database: ${process.env.MYSQL_DATABASE}`);
  console.log(`🌍 CORS origin: ${process.env.VITE_APP_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(60) + '\n');

  // ===========================================
  // Cron Jobs
  // ===========================================

  // 1. Enhanced ROI Distribution (daily at 00:00 UTC)
  // Includes base ROI + booster ROI + ROI-on-ROI distribution
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Enhanced ROI distribution starting...');
    try {
      await distributeEnhancedROI();
      console.log('✅ [CRON] Enhanced ROI distribution completed');
    } catch (error) {
      console.error('❌ [CRON] Enhanced ROI distribution failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  // 2. Expire Boosters (daily at 01:00 UTC)
  // Auto-expire boosters that have passed 30 days
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ [CRON] Booster expiration check starting...');
    try {
      await expireBoostersDaily();
      console.log('✅ [CRON] Booster expiration check completed');
    } catch (error) {
      console.error('❌ [CRON] Booster expiration check failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  // 3. Calculate Business Volumes (daily at 02:00 UTC)
  // Calculate 3-leg business volumes for all users
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [CRON] Business volume calculation starting...');
    try {
      await calculateAllBusinessVolumes();
      console.log('✅ [CRON] Business volume calculation completed');
    } catch (error) {
      console.error('❌ [CRON] Business volume calculation failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  // 4. Binary Matching (daily at 02:30 UTC, after business volumes)
  // Execute binary matching for all users with unmatched volumes
  cron.schedule('30 2 * * *', async () => {
    console.log('⏰ [CRON] Binary matching starting...');
    try {
      await runBinaryMatchingNow();
      console.log('✅ [CRON] Binary matching completed');
    } catch (error) {
      console.error('❌ [CRON] Binary matching failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  // 5. Distribute Monthly Rewards (1st day of month at 03:00 UTC)
  // Distribute monthly rewards based on business volume
  cron.schedule('0 3 1 * *', async () => {
    console.log('⏰ [CRON] Monthly rewards distribution starting...');
    try {
      await distributeMonthlyRewards();
      console.log('✅ [CRON] Monthly rewards distribution completed');
    } catch (error) {
      console.error('❌ [CRON] Monthly rewards distribution failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  console.log('\n📅 Scheduled Cron Jobs:');
  console.log('  ├─ Enhanced ROI Distribution: Daily at 00:00 UTC');
  console.log('  ├─ Booster Expiration: Daily at 01:00 UTC');
  console.log('  ├─ Business Volume Calculation: Daily at 02:00 UTC');
  console.log('  ├─ Binary Matching: Daily at 02:30 UTC');
  console.log('  └─ Monthly Rewards: 1st of month at 03:00 UTC\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

export default app;
