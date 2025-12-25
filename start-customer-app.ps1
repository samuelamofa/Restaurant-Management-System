# Start Customer App - De Fusion Flame RMS
# This script starts only the Customer App

Write-Host "🚀 Starting Customer App..." -ForegroundColor Cyan
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

# Check if node_modules exist
$nodeModulesPath = Join-Path $projectRoot "frontend\customer-app\node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "⚠️  Customer App dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "frontend\customer-app")
    npm install
    Set-Location $projectRoot
}

Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""

# Check if port is already in use
$Port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port $Port is already in use!" -ForegroundColor Yellow
    Write-Host "   Please stop the service using port $Port first." -ForegroundColor Yellow
    exit 1
}

# Get full path to customer-app
$fullPath = Join-Path $projectRoot "frontend\customer-app"
try {
    $fullPath = (Resolve-Path $fullPath -ErrorAction Stop).Path
} catch {
    Write-Host "❌ Path not found: $fullPath" -ForegroundColor Red
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Starting Customer App..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Create a batch file for more reliable execution
$batchFile = [System.IO.Path]::GetTempFileName() + ".bat"
$batchContent = @"
@echo off
chcp 65001 >nul
title Customer App - Port $Port
cd /d "$fullPath"
echo.
echo ========================================
echo 🚀 Customer App
echo 📍 Location: $fullPath
echo 🔌 Port: $Port
echo ========================================
echo.
call npm run dev
if errorlevel 1 (
    echo.
    echo ❌ Error starting Customer App
    echo Check the error message above for details.
    echo.
    pause
)
"@

[System.IO.File]::WriteAllText($batchFile, $batchContent, [System.Text.Encoding]::Default)

# Start in new cmd window
Start-Process cmd.exe -ArgumentList "/k", "`"$batchFile`""

Write-Host "✅ Customer App is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access URL: http://localhost:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 App opens in a separate window." -ForegroundColor Gray
Write-Host "   Close the window to stop the app." -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

