# Supabase → Local PostgreSQL Migration Guide

## Migration Overview

We're migrating from Supabase to local PostgreSQL to:
- ✅ Fix "ensureUserProfile is not a function" error
- ✅ Get complete control over database
- ✅ Enable direct SQL execution
- ✅ Simplify authentication flow
- ✅ Prepare for production deployment

## Step 1: Install Docker Desktop

1. Download: https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

## Step 2: Start PostgreSQL

```bash
cd C:\Projects\asterdex-8621-main

# Start PostgreSQL and pgAdmin
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

**Credentials:**
- Database: `finaster_mlm`
- User: `finaster_admin`
- Password: `finaster_secure_2024`
- Port: `5432`

**pgAdmin Web UI:**
- URL: http://localhost:5050
- Email: admin@finaster.com
- Password: admin123

## Step 3: Verify Database Setup

The database will auto-initialize with:
- ✅ Complete schema (users, packages, transactions, ranks)
- ✅ Admin account: admin@finaster.com / admin123
- ✅ Test user: user@finaster.com / user123 ($1,500 earnings)
- ✅ 10 downline users with packages

Test connection:
```bash
# Using psql (if installed)
psql postgresql://finaster_admin:finaster_secure_2024@localhost:5432/finaster_mlm

# Or use pgAdmin web UI at http://localhost:5050
```

## Step 4: Install Node Dependencies

```bash
cd C:\Projects\asterdex-8621-main

# Install PostgreSQL client and authentication packages
npm install pg bcryptjs jsonwebtoken express-session
npm install -D @types/pg @types/bcryptjs @types/jsonwebtoken @types/express-session
```

## Step 5: Update Environment Variables

Copy `.env.local` to `.env`:
```bash
cp .env.local .env
```

Key changes:
- `DATABASE_URL` now points to local PostgreSQL
- `JWT_SECRET` replaces Supabase Auth
- Removed `SUPABASE_URL` and `SUPABASE_ANON_KEY`

## Step 6: Test Login

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:5173/auth/login

3. Click Quick Login "👤 User" button

4. Expected result:
   - ✅ Successful login
   - ✅ Dashboard shows $1,500 earnings
   - ✅ 1 active package
   - ✅ GOLD rank
   - ✅ 10 team members

## Step 7: Verify All Features

Test these pages:
- ✅ Dashboard (earnings stats)
- ✅ Packages (view active package)
- ✅ Transactions (view 2 transactions)
- ✅ Team Report (view downline)
- ✅ Genealogy (tree view)
- ✅ Ranks (rank progress)

## Troubleshooting

### Docker not starting:
```bash
# Reset Docker
docker-compose down -v
docker-compose up -d
```

### Database connection failed:
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Port 5432 already in use:
```bash
# Find process using port 5432
netstat -ano | findstr :5432

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

### Login still failing:
```bash
# Verify user exists
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT email, full_name, total_earnings FROM users WHERE email = 'user@finaster.com';"
```

## Production Deployment

See `DEPLOYMENT.md` for:
- AWS RDS PostgreSQL setup
- Environment configuration
- SSL/TLS setup
- Backup strategies
- Monitoring setup

## Rollback to Supabase

If needed, restore Supabase config:
1. Rename `.env` to `.env.local.backup`
2. Restore old `.env` with Supabase credentials
3. Revert auth service changes
4. Run `npm install`

## Success Criteria

✅ Docker running PostgreSQL
✅ Login works with user@finaster.com
✅ Dashboard shows $1,500
✅ All pages load without errors
✅ No Supabase dependencies

## Next Steps

After successful migration:
1. Set up automated backups
2. Configure ROI distribution cron
3. Enable production monitoring
4. Deploy to production server
