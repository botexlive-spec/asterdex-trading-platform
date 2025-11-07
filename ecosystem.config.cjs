/**
 * PM2 Ecosystem Configuration for Finaster
 * Auto-start both frontend and backend servers
 */

module.exports = {
  apps: [
    {
      name: 'finaster-backend',
      script: 'pnpm',
      args: 'run dev:server',
      cwd: 'C:\\Projects\\asterdex-8621-main',
      env: {
        NODE_ENV: 'development',
        API_PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'finaster-frontend',
      script: 'pnpm',
      args: 'run dev',
      cwd: 'C:\\Projects\\asterdex-8621-main',
      env: {
        NODE_ENV: 'development',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
