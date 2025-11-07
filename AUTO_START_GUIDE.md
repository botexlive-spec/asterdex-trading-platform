# 🚀 Finaster Auto-Start Configuration Guide

## ✅ What's Configured

Your Finaster development environment is now configured to **automatically start on system boot**!

### Services That Auto-Start:

1. **MySQL Database** (Port 3306)
   - ✅ Already configured
   - Service: MySQL84
   - Startup Type: Automatic
   - Starts: Immediately on system boot

2. **Backend API Server** (Port 3001)
   - ✅ Configured via Windows Task Scheduler
   - Starts: 30 seconds after login
   - Runs in: Minimized window

3. **Frontend Dev Server** (Port 5173)
   - ✅ Configured via Windows Task Scheduler
   - Starts: 35 seconds after login (5 seconds after backend)
   - Runs in: Minimized window

---

## 📋 How It Works

### On System Startup:
```
1. Windows boots up
2. MySQL service starts automatically
3. You log in to Windows
4. [30 second delay]
5. Backend server starts (port 3001)
6. [5 second delay]
7. Frontend server starts (port 5173)
8. Browser opens to http://localhost:5173
```

---

## 🎯 Files Created

### 1. `start-finaster-servers.bat`
Batch script that:
- Kills any existing processes on ports 3001 and 5173
- Starts backend server in minimized window
- Starts frontend server in minimized window
- Opens browser to the application

**Manual Usage:**
```cmd
cd C:\Projects\asterdex-8621-main
start-finaster-servers.bat
```

### 2. `setup-auto-start.ps1`
PowerShell script that:
- Creates Windows Task Scheduler task
- Configures task to run at login
- Must be run as Administrator

**Re-run Setup:**
```powershell
# Right-click PowerShell > Run as Administrator
cd C:\Projects\asterdex-8621-main
.\setup-auto-start.ps1
```

### 3. Windows Scheduled Task
- **Name**: Finaster Auto-Start
- **Trigger**: At user login (Dream)
- **Delay**: 30 seconds after login
- **Status**: Ready
- **Action**: Runs start-finaster-servers.bat

---

## 🛠️ Management

### View the Scheduled Task
```cmd
taskschd.msc
```
Then navigate to: Task Scheduler Library > "Finaster Auto-Start"

### Disable Auto-Start (Temporarily)
**Option 1: Task Scheduler**
1. Open Task Scheduler (`taskschd.msc`)
2. Find "Finaster Auto-Start"
3. Right-click > Disable

**Option 2: PowerShell**
```powershell
Disable-ScheduledTask -TaskName "Finaster Auto-Start"
```

### Enable Auto-Start
**Option 1: Task Scheduler**
1. Open Task Scheduler
2. Find "Finaster Auto-Start"
3. Right-click > Enable

**Option 2: PowerShell**
```powershell
Enable-ScheduledTask -TaskName "Finaster Auto-Start"
```

### Delete Auto-Start (Permanently)
**Option 1: Task Scheduler**
1. Open Task Scheduler
2. Find "Finaster Auto-Start"
3. Right-click > Delete

**Option 2: PowerShell**
```powershell
Unregister-ScheduledTask -TaskName "Finaster Auto-Start" -Confirm:$false
```

---

## 🔍 Troubleshooting

### Servers Don't Start After Login

**Check 1: Verify Task Exists**
```powershell
Get-ScheduledTask -TaskName "Finaster Auto-Start"
```

**Check 2: Check Task History**
1. Open Task Scheduler
2. Find "Finaster Auto-Start"
3. Click "History" tab
4. Look for errors

**Check 3: Test Manual Start**
```cmd
cd C:\Projects\asterdex-8621-main
start-finaster-servers.bat
```

### Ports Already in Use

The batch script automatically kills processes on ports 3001 and 5173. If you see errors:

```cmd
# Manually kill processes
FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :3001') DO TaskKill /F /PID %P
FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :5173') DO TaskKill /F /PID %P
```

### MySQL Service Not Running

**Check Status:**
```powershell
Get-Service -Name MySQL84
```

**Start Manually:**
```powershell
Start-Service -Name MySQL84
```

**Set to Auto-Start:**
```powershell
Set-Service -Name MySQL84 -StartupType Automatic
```

### Browser Doesn't Open

The batch script automatically opens http://localhost:5173 after starting servers. If it doesn't open:

1. Wait 10-15 seconds after login
2. Manually open: http://localhost:5173

---

## 📊 Server Status

### Check if Servers are Running

**Backend (Port 3001):**
```powershell
# PowerShell
Test-NetConnection localhost -Port 3001

# OR visit in browser
http://localhost:3001/api/health
```

**Frontend (Port 5173):**
```powershell
# PowerShell
Test-NetConnection localhost -Port 5173

# OR visit in browser
http://localhost:5173
```

### View Server Windows

The servers run in minimized windows titled:
- "Finaster Backend"
- "Finaster Frontend"

Check your taskbar for these windows.

### Stop Servers

**Option 1: Close Windows**
- Find the minimized windows in taskbar
- Close them manually

**Option 2: Kill Processes**
```cmd
FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :3001') DO TaskKill /F /PID %P
FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :5173') DO TaskKill /F /PID %P
```

---

## 🔄 Testing Auto-Start

### Test Now (Without Rebooting)

1. Close any running servers
2. Run the batch file:
   ```cmd
   cd C:\Projects\asterdex-8621-main
   start-finaster-servers.bat
   ```
3. Verify:
   - Backend: http://localhost:3001/api/health
   - Frontend: http://localhost:5173

### Test After Reboot

1. Restart your computer
2. Log in to Windows
3. Wait 30-40 seconds
4. Browser should automatically open to http://localhost:5173
5. Servers should be running in minimized windows

---

## 📝 Login Credentials

Once servers are running:

### Admin Account
- URL: http://localhost:5173/login
- Email: `admin@finaster.com`
- Password: `admin123`

### User Account
- URL: http://localhost:5173/login
- Email: `user@finaster.com`
- Password: `user123`

---

## ⚙️ Advanced Configuration

### Change Startup Delay

Edit the scheduled task:
1. Open Task Scheduler
2. Find "Finaster Auto-Start"
3. Right-click > Properties
4. Triggers tab > Edit
5. Advanced settings > Delay task for: [change from 30 seconds]

### Run Without Opening Browser

Edit `start-finaster-servers.bat`:
1. Remove or comment out this line:
   ```batch
   start http://localhost:5173
   ```

### Change Ports

If you need different ports:

1. Edit `.env`:
   ```env
   API_PORT=3001        # Backend port
   VITE_PORT=5173       # Frontend port (set in vite.config)
   ```

2. Update `start-finaster-servers.bat`:
   - Change port numbers in the netstat/taskkill commands
   - Change port numbers in the echo statements

---

## 🎉 Success!

Your Finaster development environment will now start automatically every time you log in to Windows!

### What Happens Now:

1. ✅ MySQL starts on boot
2. ✅ Backend API starts 30 seconds after login
3. ✅ Frontend starts 35 seconds after login
4. ✅ Browser opens to the application
5. ✅ You can start working immediately!

---

## 📞 Quick Reference

### URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/api/health

### Files
- Startup Script: `C:\Projects\asterdex-8621-main\start-finaster-servers.bat`
- Setup Script: `C:\Projects\asterdex-8621-main\setup-auto-start.ps1`
- This Guide: `C:\Projects\asterdex-8621-main\AUTO_START_GUIDE.md`

### Commands
- Manual Start: `start-finaster-servers.bat`
- View Task: `taskschd.msc`
- Check MySQL: `Get-Service MySQL84`
- Test Backend: `curl http://localhost:3001/api/health`

---

**Happy Coding! 🚀**
