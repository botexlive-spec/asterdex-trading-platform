# Action Plan: Complete Migration to Local PostgreSQL

## Summary
Your Finaster MLM application is ready to migrate from Supabase to local PostgreSQL. All configuration files, scripts, and setup are complete. You now have full control over your database and can run SQL scripts directly.

---

## What's Been Done ✅

### 1. Infrastructure Setup ✅
- ✅ Docker Compose configured for PostgreSQL 15 + pgAdmin
- ✅ Express backend API server created (port 3001)
- ✅ Database schema with MLM features prepared
- ✅ Seed data with test users and $1,500 earnings
- ✅ Password hashes generated (bcrypt)

### 2. Environment Configuration ✅
- ✅ `.env` updated with PostgreSQL credentials
- ✅ Frontend auth service configured to call Express API
- ✅ Backend database connection configured

### 3. Migration Tools ✅
- ✅ Data export script created (`export-supabase-data.ts`)
- ✅ Quick start script created (`start-local.bat`)
- ✅ Migration guide created (`MIGRATION_TO_LOCAL_POSTGRES.md`)
- ✅ Quick reference created (`QUICKSTART.md`)

### 4. Authentication Fixed ✅
- ✅ Removed `ensureUserProfile` auto-creation (not needed with local DB)
- ✅ Frontend login calls Express API backend
- ✅ JWT-based authentication ready
- ✅ Password hashing with bcrypt configured

---

## What You Need to Do Now 📋

### Phase 1: Start Docker and Database (5 minutes)

#### Step 1.1: Start Docker Desktop
```
1. Open Docker Desktop application
2. Wait for "Docker is running" status
3. Verify: Open PowerShell and run:
   docker ps
```

#### Step 1.2: Start PostgreSQL
```bash
cd C:\Projects\asterdex-8621-main
docker-compose up -d
```

Wait 10 seconds for initialization:
```bash
timeout /t 10 /nobreak
```

#### Step 1.3: Verify Database is Ready
```bash
# Check containers are running
docker ps

# Should show:
# - finaster-postgres (PostgreSQL)
# - finaster-pgadmin (pgAdmin)

# Test database connection
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT version();"
```

### Phase 2: Export Data from Supabase (Optional, 2 minutes)

**Only do this if you have existing data you want to keep**

```bash
cd C:\Projects\asterdex-8621-main
npx tsx export-supabase-data.ts
```

This creates `supabase-data-export.sql` with all your users, packages, and transactions.

#### Import to Local Database
```bash
docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < supabase-data-export.sql
```

**OR skip this if starting fresh** - the seed data already includes test users.

### Phase 3: Start the Application (2 minutes)

#### Option A: Quick Start (Recommended)
```bash
cd C:\Projects\asterdex-8621-main
start-local.bat
```

This automatically:
- Checks Docker is running
- Starts PostgreSQL
- Starts both backend API and frontend

#### Option B: Manual Start
```bash
# Terminal 1 - Backend API
cd C:\Projects\asterdex-8621-main
npm run dev:server

# Terminal 2 - Frontend
cd C:\Projects\asterdex-8621-main
npm run dev
```

### Phase 4: Test Login (1 minute)

1. Open http://localhost:5173
2. Login with test user:
   - Email: `user@finaster.com`
   - Password: `user123`
3. ✅ Should redirect to dashboard
4. ✅ Should show $1,500 total earnings

Alternative login (admin):
   - Email: `admin@finaster.com`
   - Password: `admin123`

---

## Service Endpoints

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:3001 | - |
| **API Health** | http://localhost:3001/api/health | - |
| **pgAdmin** | http://localhost:5050 | admin@finaster.com / admin123 |
| **PostgreSQL** | localhost:5432 | finaster_admin / finaster_secure_2024 |

---

## Verification Commands

### Check Everything is Running
```bash
# 1. Docker containers
docker ps

# 2. Backend API health
curl http://localhost:3001/api/health

# 3. Database has users
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT email, total_earnings, current_rank FROM users WHERE email = 'user@finaster.com';"

# Expected output:
#        email         | total_earnings | current_rank
# ---------------------+----------------+--------------
#  user@finaster.com   |        1500.00 | gold
```

### Test Login API
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@finaster.com\",\"password\":\"user123\"}"

# Expected: JSON with token and user data
```

---

## Database Management

### Access PostgreSQL via CLI
```bash
# Connect
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm

# Useful commands:
\dt                                    # List all tables
\d users                               # Describe users table
SELECT * FROM users LIMIT 5;          # View users
SELECT * FROM user_packages;          # View packages
SELECT * FROM mlm_transactions;       # View transactions
\q                                     # Quit
```

### Run SQL Scripts Directly
```bash
# Example: Run any .sql file
docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < your-script.sql

# Example: Run inline SQL
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "
  UPDATE users
  SET total_earnings = 5000
  WHERE email = 'user@finaster.com';
"
```

### Access via pgAdmin (GUI)
1. Open http://localhost:5050
2. Login: `admin@finaster.com` / `admin123`
3. Add Server:
   - Name: Finaster Local
   - Host: `postgres` (container name)
   - Port: 5432
   - Database: finaster_mlm
   - Username: finaster_admin
   - Password: finaster_secure_2024

---

## Troubleshooting

### Issue: "Docker is not running"
**Solution:**
1. Start Docker Desktop manually
2. Wait for ready status
3. Run `docker ps` to verify
4. Retry start-local.bat

### Issue: "Port 5432 already in use"
**Solution:**
```bash
# Check what's using port 5432
netstat -ano | findstr :5432

# If MySQL is running, stop it:
net stop MySQL84

# Or kill the specific process
taskkill /PID <PID> /F
```

### Issue: "Backend can't connect to database"
**Solution:**
1. Check PostgreSQL is running: `docker ps`
2. Check logs: `docker logs finaster-postgres`
3. Restart: `docker-compose restart postgres`
4. Wait 10 seconds and retry

### Issue: "Login fails with 401 Unauthorized"
**Possible causes:**
1. Backend not running - Check http://localhost:3001/api/health
2. Database empty - Check user exists in database
3. Wrong password - Verify using: user123
4. Password hash incorrect - Check seed data was loaded

**Solution:**
```bash
# Verify test user exists with correct password hash
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "
  SELECT email, password_hash FROM users WHERE email = 'user@finaster.com';
"

# If user doesn't exist, reload seed data:
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose restart postgres
# Wait 10 seconds for auto-init
```

### Issue: "Dashboard shows $0 earnings"
**Solution:**
1. Check database has transactions:
```bash
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "
  SELECT user_id, transaction_type, amount
  FROM mlm_transactions
  WHERE user_id = (SELECT id FROM users WHERE email = 'user@finaster.com');
"
```

2. If empty, run seed data again:
```bash
docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < database/init/02_seed_data.sql
```

3. Hard refresh browser: `Ctrl + Shift + R`
4. Clear localStorage: F12 → Application → Local Storage → Clear All

---

## Daily Workflow

### Start Development
```bash
cd C:\Projects\asterdex-8621-main
start-local.bat
```

### Stop Development
```bash
# Stop containers
docker-compose down

# Stop API + Frontend
# Ctrl+C in terminal where start-local.bat is running
```

### Reset Database (Fresh Start)
```bash
# Stop everything
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for auto-initialization
timeout /t 10 /nobreak

# Verify
docker exec finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT COUNT(*) FROM users;"
```

---

## Next Steps After Successful Migration

1. ✅ **Test All Features**
   - User registration
   - Package purchase
   - Referral system
   - Commission calculations
   - ROI distribution
   - Admin dashboard

2. ✅ **Set Up Automated ROI Distribution**
   - Create cron job script
   - Schedule daily execution
   - Test with sample data

3. ✅ **Configure Backups**
   - Daily automated backups
   - Backup rotation policy
   - Test restore process

4. ✅ **Production Deployment**
   - Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
   - PM2 for backend
   - Nginx reverse proxy
   - SSL certificates
   - Monitoring & logging

---

## Migration Benefits

✅ **Full Control** - Run any SQL script directly
✅ **No Cloud Limits** - No Supabase restrictions
✅ **Cost Savings** - Free local dev, cheap production
✅ **Faster Development** - Local database queries
✅ **Easy Debugging** - Direct database access
✅ **Production Ready** - Same architecture everywhere
✅ **Automation** - Scheduled jobs, backups, migrations

---

## Support Files

- `QUICKSTART.md` - Quick reference guide
- `MIGRATION_TO_LOCAL_POSTGRES.md` - Detailed migration guide
- `docker-compose.yml` - Database configuration
- `start-local.bat` - Quick start script
- `export-supabase-data.ts` - Data export tool
- `database/init/01_schema.sql` - Database schema
- `database/init/02_seed_data.sql` - Test data
- `server/index.ts` - Backend API
- `app/services/auth.service.ts` - Authentication

---

## Test User Credentials

### Regular User (with $1,500 earnings)
- Email: `user@finaster.com`
- Password: `user123`
- Role: user
- Rank: Gold
- Earnings: $1,500 ($500 ROI + $1,000 commission)
- Package: $10,000 VIP Package
- Downline: 10 users

### Admin User
- Email: `admin@finaster.com`
- Password: `admin123`
- Role: admin
- Rank: Ambassador

### Downline Users (1-10)
- Emails: `downline1@finaster.com` to `downline10@finaster.com`
- Password: `user123` (all same)
- Each has $1,000 starter package

---

## Success Criteria ✅

After completing the migration, verify:

- [  ] Docker PostgreSQL running
- [  ] Backend API accessible at http://localhost:3001
- [  ] Frontend accessible at http://localhost:5173
- [  ] Login works with user@finaster.com / user123
- [  ] Dashboard loads without errors
- [  ] Dashboard shows $1,500 earnings
- [  ] User rank shows "Gold"
- [  ] Active packages shows "1"
- [  ] Can access pgAdmin at http://localhost:5050
- [  ] Database has 12 users (1 admin + 1 test + 10 downline)
- [  ] Database has transactions for test user

---

## Questions?

If you encounter any issues:
1. Check the troubleshooting section above
2. Run verification commands
3. Check Docker logs: `docker logs finaster-postgres`
4. Check API logs: Terminal where backend is running
5. Check browser console: F12 → Console tab

---

**Ready to start? Follow Phase 1 above!** 🚀

**Estimated total time: 10-15 minutes**
