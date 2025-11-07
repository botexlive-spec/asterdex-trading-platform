# Starting the Finaster MLM Application

## Prerequisites

1. ✅ PostgreSQL installed and running
2. ✅ Database `finaster_mlm` created with seed data
3. ✅ `.env` file configured

## Method 1: Start Both Servers Together (Recommended)

```bash
cd C:\Projects\asterdex-8621-main

# Start both API server and frontend
npm run dev:all
```

This will start:
- **API Server**: http://localhost:3001
- **Frontend**: http://localhost:5173

## Method 2: Start Servers Separately

### Terminal 1 - API Server
```bash
cd C:\Projects\asterdex-8621-main
npm run dev:server
```

You should see:
```
🚀 Finaster MLM API Server
📍 Server running on: http://localhost:3001
✅ API Server connected to PostgreSQL
```

### Terminal 2 - Frontend
```bash
cd C:\Projects\asterdex-8621-main
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## Testing the Setup

### 1. Test API Health
Open: http://localhost:3001/api/health

Should see:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-..."
}
```

### 2. Test Login
1. Open: http://localhost:5173/auth/login
2. Click **"👤 User"** button (Quick Login)
3. Should redirect to dashboard
4. Should see **$1,500 earnings**!

### 3. Verify Database Connection
Check API server terminal - should see:
```
✅ API Server connected to PostgreSQL
🔐 Login attempt: user@finaster.com
✅ Login successful: user@finaster.com
```

## Troubleshooting

### API Server won't start

**Error: Port 3001 in use**
```bash
# Find process
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Or change port in .env
API_PORT=3002
```

**Error: Database connection failed**
```bash
# Check PostgreSQL is running
net start postgresql-x64-15

# Test connection
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT 1;"
```

**Error: Cannot find module**
```bash
# Reinstall dependencies
npm install
```

### Frontend won't connect to API

**Check .env has:**
```
VITE_API_URL=http://localhost:3001
```

**Clear browser cache:**
- Press `Ctrl + Shift + R` (hard refresh)
- Or open DevTools (F12) → Network tab → Disable cache

**CORS error in browser console:**
- API server should be running on port 3001
- Check API server terminal for CORS configuration

### Login fails

**Check browser console (F12) for errors**

**Common issues:**
1. API server not running → Start with `npm run dev:server`
2. Database not seeded → Run `setup-database.bat`
3. Wrong password → Use `user123` for user@finaster.com

**Verify user exists:**
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finaster_mlm -c "SELECT email, total_earnings FROM users WHERE email = 'user@finaster.com';"
```

Should show:
```
email              | total_earnings
-------------------+---------------
user@finaster.com  | 1500.000000
```

## Success Indicators

✅ API server shows: `✅ API Server connected to PostgreSQL`
✅ Frontend loads at http://localhost:5173
✅ Login button works
✅ Dashboard shows $1,500
✅ No Supabase errors in console

## Next Steps

After successful login:
- View packages page
- Check transactions
- Explore team report
- Test all MLM features

## Stopping Servers

Press `Ctrl + C` in both terminal windows

Or if running with `npm run dev:all`:
- Press `Ctrl + C` once to stop both

## Production Deployment

See `DEPLOYMENT.md` for:
- Production environment setup
- AWS/VPS deployment
- SSL configuration
- Database backups
