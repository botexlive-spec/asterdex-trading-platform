# Quick Start: Migrate to Local PostgreSQL

## Current Status
✅ Docker Compose configured
✅ Express backend ready
✅ Environment variables configured
✅ Database schema prepared
✅ Startup script created
✅ Data export script ready

## Migration Steps (5-10 minutes)

### Step 1: Start Docker Desktop
**REQUIRED: Manual action**

1. Open Docker Desktop on Windows
2. Wait for "Docker is running" message
3. Verify: Open PowerShell and run `docker ps`

### Step 2: Export Data from Supabase

```bash
cd C:\Projects\asterdex-8621-main
npx tsx export-supabase-data.ts
```

This will create `supabase-data-export.sql` with all your users, packages, and transactions.

### Step 3: Start PostgreSQL

```bash
docker-compose up -d
```

Wait 10 seconds for PostgreSQL to initialize:
```bash
timeout /t 10 /nobreak
```

### Step 4: Import Data (if you have existing data)

```bash
docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < supabase-data-export.sql
```

If you're starting fresh, the database will auto-initialize with seed data.

### Step 5: Start the Application

**Option A: Quick Start (Recommended)**
```bash
start-local.bat
```

**Option B: Manual Start**
```bash
# Terminal 1 - Backend API
npm run dev:server

# Terminal 2 - Frontend
npm run dev
```

### Step 6: Test Login

1. Open http://localhost:5173
2. Login with:
   - Email: `user@finaster.com`
   - Password: `user123`
3. Verify dashboard shows earnings

## Endpoints

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | user@finaster.com / user123 |
| **Backend API** | http://localhost:3001 | - |
| **API Health** | http://localhost:3001/api/health | - |
| **pgAdmin** | http://localhost:5050 | admin@finaster.com / admin123 |
| **PostgreSQL** | localhost:5432 | finaster_admin / finaster_secure_2024 |

## Verification Checklist

After starting everything:

```bash
# 1. Check Docker containers
docker ps

# 2. Check backend health
curl http://localhost:3001/api/health

# 3. Check database connection
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm -c "SELECT COUNT(*) FROM users;"

# 4. Test login API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@finaster.com\",\"password\":\"user123\"}"
```

## Database Access

### Using Docker CLI
```bash
# Connect to PostgreSQL
docker exec -it finaster-postgres psql -U finaster_admin -d finaster_mlm

# Run queries
\dt                                    # List tables
SELECT * FROM users LIMIT 5;          # View users
SELECT COUNT(*) FROM transactions;    # Count transactions
\q                                     # Quit
```

### Using pgAdmin (GUI)
1. Open http://localhost:5050
2. Login: admin@finaster.com / admin123
3. Add server:
   - Name: Finaster Local
   - Host: postgres
   - Port: 5432
   - Database: finaster_mlm
   - Username: finaster_admin
   - Password: finaster_secure_2024

## Troubleshooting

### Docker not running
```
Error: Cannot connect to Docker daemon
```
**Solution**: Start Docker Desktop manually and wait for it to be ready.

### Port 5432 already in use
```
Error: Port 5432 is already allocated
```
**Solution**: Stop any existing PostgreSQL service:
```bash
# Check what's using port 5432
netstat -ano | findstr :5432

# Stop MySQL or other PostgreSQL instance
net stop MySQL84  # if MySQL is running
# OR kill the process using Task Manager
```

### Backend can't connect to database
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**:
1. Check PostgreSQL is running: `docker ps`
2. Check logs: `docker logs finaster-postgres`
3. Restart: `docker-compose restart postgres`

### Frontend shows "Login failed"
**Solution**:
1. Check backend is running: `curl http://localhost:3001/api/health`
2. Check database has users: See verification checklist above
3. Check browser console for errors (F12)

### Database empty after import
**Solution**:
1. Re-run export: `npx tsx export-supabase-data.ts`
2. Check file was created: `dir supabase-data-export.sql`
3. Re-import: `docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < supabase-data-export.sql`

## Daily Development Workflow

```bash
# Start everything
start-local.bat

# Or manually:
docker-compose up -d        # Start database
npm run dev:all             # Start API + Frontend

# Stop everything
docker-compose down         # Stop database
# Ctrl+C in terminal        # Stop API + Frontend
```

## Database Backup

```bash
# Backup
docker exec finaster-postgres pg_dump -U finaster_admin finaster_mlm > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i finaster-postgres psql -U finaster_admin -d finaster_mlm < backup-20250105.sql
```

## Next Steps

After successful migration:

1. ✅ Test all features (dashboard, packages, transactions, etc.)
2. ✅ Set up automated ROI distribution
3. ✅ Configure database backups
4. ✅ Production deployment planning
5. ✅ Monitoring and logging

## Benefits of Local PostgreSQL

✅ **Full Control** - No cloud limitations
✅ **Faster Development** - Local database queries
✅ **Cost Savings** - No Supabase fees
✅ **Easy Debugging** - Direct database access
✅ **Production Ready** - Same architecture as production
✅ **Automation** - Run scripts directly
✅ **Testing** - Easy to reset and seed data

## Support Files

- `MIGRATION_TO_LOCAL_POSTGRES.md` - Detailed migration guide
- `docker-compose.yml` - PostgreSQL configuration
- `start-local.bat` - Quick start script
- `export-supabase-data.ts` - Data export tool
- `database/init/` - Schema and seed data

## Questions?

Check these files for more details:
- Database schema: `database/init/01_schema.sql`
- Backend API: `server/index.ts`
- Auth service: `app/services/auth.service.ts`
- Docker config: `docker-compose.yml`
