# ============================================================================
# Finaster Auto-Start Setup Script
# This script creates a Windows Task Scheduler task to start servers on boot
# ============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Finaster Auto-Start Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Task details
$taskName = "Finaster Auto-Start"
$taskDescription = "Automatically starts Finaster frontend and backend servers on system startup"
$scriptPath = "C:\Projects\asterdex-8621-main\start-finaster-servers.bat"
$userName = $env:USERNAME

Write-Host "Creating Windows Task Scheduler task..." -ForegroundColor Green
Write-Host ""
Write-Host "Task Name: $taskName" -ForegroundColor Gray
Write-Host "Script: $scriptPath" -ForegroundColor Gray
Write-Host "User: $userName" -ForegroundColor Gray
Write-Host ""

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the action (run the batch file)
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""

# Create the trigger (at logon with a 30-second delay to allow system to stabilize)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userName
$trigger.Delay = "PT30S"  # 30 second delay

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Create the principal (run whether user is logged on or not)
$principal = New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $taskName `
        -Description $taskDescription `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force | Out-Null

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "SUCCESS! Auto-start configured successfully!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Finaster servers will now start automatically when you log in." -ForegroundColor White
    Write-Host ""
    Write-Host "What happens:" -ForegroundColor Cyan
    Write-Host "  1. MySQL starts automatically (already configured)" -ForegroundColor White
    Write-Host "  2. 30 seconds after login, the batch script runs" -ForegroundColor White
    Write-Host "  3. Backend server starts on port 3001" -ForegroundColor White
    Write-Host "  4. Frontend server starts on port 5173" -ForegroundColor White
    Write-Host "  5. Browser opens to http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "To manage the task:" -ForegroundColor Cyan
    Write-Host "  - View: taskschd.msc (Task Scheduler)" -ForegroundColor White
    Write-Host "  - Disable: Right-click task > Disable" -ForegroundColor White
    Write-Host "  - Delete: Right-click task > Delete" -ForegroundColor White
    Write-Host ""
    Write-Host "To test now:" -ForegroundColor Cyan
    Write-Host "  Run: start-finaster-servers.bat" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "ERROR: Failed to create task" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press Enter to exit..."
Read-Host
