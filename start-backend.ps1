# Start Backend Server - De Fusion Flame RMS
# This script starts only the backend API server

Write-Host "🚀 Starting Backend API Server..." -ForegroundColor Cyan
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

# Check if node_modules exist
$nodeModulesPath = Join-Path $projectRoot "backend\node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "⚠️  Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "backend")
    npm install
    Set-Location $projectRoot
}

Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""

# Check if port is already in use
$Port = 5000
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port $Port is already in use!" -ForegroundColor Yellow
    Write-Host "   Please stop the service using port $Port first." -ForegroundColor Yellow
    exit 1
}

# Get full path to backend
$fullPath = Join-Path $projectRoot "backend"
try {
    $fullPath = (Resolve-Path $fullPath -ErrorAction Stop).Path
} catch {
    Write-Host "❌ Path not found: $fullPath" -ForegroundColor Red
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Starting Backend API Server..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Create a batch file for more reliable execution
$batchFile = [System.IO.Path]::GetTempFileName() + ".bat"
$batchContent = @"
@echo off
chcp 65001 >nul
title Backend API - Port $Port
cd /d "$fullPath"
echo.
echo ========================================
echo 🚀 Backend API Server
echo 📍 Location: $fullPath
echo 🔌 Port: $Port
echo ========================================
echo.
call npm run dev
if errorlevel 1 (
    echo.
    echo ❌ Error starting Backend API
    echo Check the error message above for details.
    echo.
    pause
)
"@

[System.IO.File]::WriteAllText($batchFile, $batchContent, [System.Text.Encoding]::Default)

# Start in new cmd window
Start-Process cmd.exe -ArgumentList "/k", "`"$batchFile`""

Write-Host "✅ Backend API Server is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access URL: http://localhost:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Server opens in a separate window." -ForegroundColor Gray
Write-Host "   Close the window to stop the server." -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan


