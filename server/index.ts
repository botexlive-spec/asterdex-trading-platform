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
import { pool, query } from './db';
import { distributeROI } from './cron/roi-distribution';

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
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/genealogy', genealogyRoutes);
app.use('/api/transactions', transactionsRoutes);

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
  console.log(`💾 Database: ${process.env.POSTGRES_DB}`);
  console.log(`🌍 CORS origin: ${process.env.VITE_APP_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(60) + '\n');

  // Schedule ROI distribution to run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Scheduled ROI distribution starting...');
    try {
      await distributeROI();
      console.log('✅ Scheduled ROI distribution completed');
    } catch (error) {
      console.error('❌ Scheduled ROI distribution failed:', error);
    }
  }, {
    timezone: "UTC"
  });

  console.log('⏰ ROI Distribution Cron Job scheduled (daily at 00:00 UTC)');
  console.log(`   Manual trigger: POST http://localhost:${PORT}/api/admin/distribute-roi\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

export default app;
