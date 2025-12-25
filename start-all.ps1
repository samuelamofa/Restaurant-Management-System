# Start All Servers - De Fusion Flame RMS
# This script starts all servers in separate windows

Write-Host "🚀 Starting De Fusion Flame RMS System..." -ForegroundColor Cyan
Write-Host ""

# Get the project root directory
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

Set-Location $projectRoot

# Check if Node.js and npm are available
Write-Host "📋 Checking system prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js $nodeVersion, npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js or npm not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if .env exists
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
    Write-Host "   Please create backend/.env file with your configuration" -ForegroundColor Yellow
    exit 1
}

# Check if database exists
$dbPath = "backend\prisma\dev.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "⚠️  Database not found. Running migrations..." -ForegroundColor Yellow
    Set-Location "backend"
    npx prisma migrate dev --name init
    npx prisma generate
    Set-Location $projectRoot
}

# Check if Prisma client is generated
if (-not (Test-Path "backend\node_modules\@prisma\client")) {
    Write-Host "⚠️  Prisma Client not found. Generating..." -ForegroundColor Yellow
    Set-Location "backend"
    npx prisma generate
    Set-Location $projectRoot
}

# Check if node_modules exist in each app
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
$apps = @(
    @{Name="Backend"; Path="backend"},
    @{Name="Customer App"; Path="frontend\customer-app"},
    @{Name="POS App"; Path="frontend\pos-app"},
    @{Name="KDS App"; Path="frontend\kds-app"},
    @{Name="Admin App"; Path="frontend\admin-app"}
)

foreach ($app in $apps) {
    $nodeModulesPath = Join-Path $projectRoot $app.Path "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "⚠️  $($app.Name) dependencies not found. Installing..." -ForegroundColor Yellow
        Set-Location (Join-Path $projectRoot $app.Path)
        npm install
        Set-Location $projectRoot
    }
}

Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""

# Function to start a server in a new window
function Start-Server {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Yellow
    
    # Check if port is already in use
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "⚠️  Port $Port is already in use. Skipping $Name" -ForegroundColor Yellow
        return
    }
    
    # Normalize the path - handle both relative and absolute paths
    if ([System.IO.Path]::IsPathRooted($Path)) {
        $fullPath = $Path
    } else {
        $fullPath = Join-Path $projectRoot $Path
    }
    
    # Resolve to absolute path
    try {
        $fullPath = (Resolve-Path $fullPath -ErrorAction Stop).Path
    } catch {
        Write-Host "❌ Path not found: $fullPath" -ForegroundColor Red
        return
    }
    
    # Create a batch file for more reliable execution
    $batchFile = [System.IO.Path]::GetTempFileName() + ".bat"
    $batchContent = @"
@echo off
chcp 65001 >nul
title $Name - Port $Port
cd /d "$fullPath"
echo.
echo ========================================
echo 🚀 $Name
echo 📍 Location: $fullPath
echo 🔌 Port: $Port
echo ========================================
echo.
call $Command
if errorlevel 1 (
    echo.
    echo ❌ Error starting $Name
    echo Check the error message above for details.
    echo.
    pause
)
"@
    
    [System.IO.File]::WriteAllText($batchFile, $batchContent, [System.Text.Encoding]::Default)
    
    # Start in new cmd window
    Start-Process cmd.exe -ArgumentList "/k", "`"$batchFile`""
    
    Start-Sleep -Seconds 3
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Starting Servers..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Start Backend (Port 5000)
Start-Server -Name "Backend API" -Path (Join-Path $projectRoot "backend") -Command "npm run dev" -Port 5000

# Start Customer App (Port 3000)
Start-Server -Name "Customer App" -Path (Join-Path $projectRoot "frontend\customer-app") -Command "npm run dev" -Port 3000

# Start POS App (Port 3001)
Start-Server -Name "POS App" -Path (Join-Path $projectRoot "frontend\pos-app") -Command "npm run dev" -Port 3001

# Start KDS App (Port 3002)
Start-Server -Name "KDS App" -Path (Join-Path $projectRoot "frontend\kds-app") -Command "npm run dev" -Port 3002

# Start Admin App (Port 3003)
Start-Server -Name "Admin App" -Path (Join-Path $projectRoot "frontend\admin-app") -Command "npm run dev" -Port 3003

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ All servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access URLs:" -ForegroundColor White
Write-Host "   Backend API:    http://localhost:5000" -ForegroundColor Yellow
Write-Host "   Customer App:   http://localhost:3000" -ForegroundColor Yellow
Write-Host "   POS App:        http://localhost:3001" -ForegroundColor Yellow
Write-Host "   KDS App:        http://localhost:3002" -ForegroundColor Yellow
Write-Host "   Admin App:      http://localhost:3003" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Each server opens in a separate window." -ForegroundColor Gray
Write-Host "   Close the windows to stop the servers." -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

