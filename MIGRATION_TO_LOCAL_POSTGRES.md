# Migration from Supabase to Local PostgreSQL

## Overview
Migrating the Finaster MLM application from Supabase to local PostgreSQL for complete control and automation.

## Architecture
- **Frontend**: React + TypeScript (Vite) on port 5173
- **Backend API**: Express + TypeScript on port 3001
- **Database**: PostgreSQL 15 on port 5432
- **Admin Tool**: pgAdmin 4 on port 5050

## Prerequisites
✅ Docker Desktop installed
✅ Docker Compose ready
✅ Database schema prepared
✅ Express backend configured

## Step-by-Step Migration

### Step 1: Start Docker Desktop
**ACTION REQUIRED**: Start Docker Desktop manually on Windows
- Open Docker Desktop application
- Wait for "Docker is running" status
- Verify with: `docker ps`

### Step 2: Start PostgreSQL with Docker Compose
```bash
cd C:\Projects\asterdex-8621-main
docker-compose up -d
```

This will start:
- PostgreSQL 15 on port 5432
- pgAdmin on port 5050 (http://localhost:5050)

Database Configuration:
- Database: `finaster_mlm`
- User: `finaster_admin`
- Password: `finaster_secure_2024`
- Port: `5432`

### Step 3: Verify Database Connection
```bash
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT version();"
```

### Step 4: Update Environment Variables
Update `.env` file:
```env
# PostgreSQL Local Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=finaster_mlm
POSTGRES_USER=finaster_admin
POSTGRES_PASSWORD=finaster_secure_2024

# API Server
API_PORT=3001
JWT_SECRET=finaster_jwt_secret_key_change_in_production_2024

# Frontend
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001
```

### Step 5: Export Existing Data from Supabase
The migration script will:
1. Connect to Supabase
2. Export all user data
3. Export all transactions
4. Export all packages
5. Generate SQL INSERT statements

### Step 6: Install Dependencies
```bash
# Install backend dependencies
cd C:\Projects\asterdex-8621-main
npm install express cors dotenv pg bcryptjs jsonwebtoken
npm install -D @types/express @types/cors @types/pg @types/bcryptjs @types/jsonwebtoken
```

### Step 7: Start Backend API Server
```bash
npx ts-node server/index.ts
```

Expected output:
```
============================================================
🚀 Finaster MLM API Server
============================================================
📍 Server running on: http://localhost:3001
🔗 Health check: http://localhost:3001/api/health
🔐 Auth endpoint: http://localhost:3001/api/auth/login
💾 Database: finaster_mlm
🌍 CORS origin: http://localhost:5173
============================================================
```

### Step 8: Start Frontend
```bash
npm run dev
```

### Step 9: Test Login
Navigate to http://localhost:5173
- Email: `user@finaster.com`
- Password: `user123`

Expected result:
- ✅ Login successful
- ✅ Dashboard loads
- ✅ Earnings displayed correctly ($1,500)

## Database Schema
The database includes:
- ✅ users table (auth + MLM data)
- ✅ user_packages (investment packages)
- ✅ transactions (financial records)
- ✅ commissions (MLM payouts)
- ✅ ranks (rank requirements)
- ✅ rank_rewards (reward configurations)

## Auto-Initialization
The Docker Compose setup automatically:
1. Creates the database
2. Runs schema from `database/init/01_schema.sql`
3. Loads seed data from `database/init/02_seed_data.sql`

## Accessing pgAdmin
1. Open http://localhost:5050
2. Login:
   - Email: admin@finaster.com
   - Password: admin123
3. Add server:
   - Name: Finaster Local
   - Host: postgres (container name)
   - Port: 5432
   - Database: finaster_mlm
   - Username: finaster_admin
   - Password: finaster_secure_2024

## Troubleshooting

### Docker not running
```bash
# Check Docker status
docker --version
docker ps

# If error, start Docker Desktop manually
```

### Port already in use
```bash
# Check what's using port 5432
netstat -ano | findstr :5432
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

### Cannot connect to database
```bash
# Check logs
docker logs finaster-postgres

# Restart container
docker-compose restart postgres
```

### Authentication fails
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check database has user data
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT email FROM users LIMIT 5;"
```

## Benefits of Local PostgreSQL
✅ Full control over database
✅ No external dependencies
✅ Faster development
✅ Easy to run SQL scripts
✅ Better for automation
✅ Production-ready architecture
✅ Free (no Supabase costs)

## Next Steps After Migration
1. Set up automated ROI distribution cron job
2. Configure backups
3. Set up monitoring
4. Production deployment
5. CI/CD pipeline

## Production Deployment
For production, replace Docker with:
- Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- PM2 for backend process management
- Nginx for reverse proxy
- SSL certificates

## Support
If you encounter issues:
1. Check Docker logs: `docker logs finaster-postgres`
2. Check API logs: Check terminal where API is running
3. Check frontend console: Browser DevTools
4. Verify all services are running: `docker ps` and `netstat -ano | findstr "5173 3001 5432"`
