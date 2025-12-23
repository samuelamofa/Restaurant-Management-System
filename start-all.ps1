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

# Check if .env exists
Write-Host "📋 Checking system prerequisites..." -ForegroundColor Yellow
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Backend .env file not found!" -ForegroundColor Red
    Write-Host "   Run: .\fix-system.ps1 to set up the system" -ForegroundColor Yellow
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
    
    # Start in new PowerShell window
    $scriptBlock = {
        param($path, $command, $name)
        Set-Location $path
        Write-Host "🚀 $name starting..." -ForegroundColor Green
        Write-Host "📍 Location: $path" -ForegroundColor Gray
        Write-Host ""
        Invoke-Expression $command
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { $($scriptBlock.ToString()) -path '$Path' -command '$Command' -name '$Name' }"
    
    Start-Sleep -Seconds 2
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Starting Servers..." -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Start Backend (Port 5000)
Start-Server -Name "Backend API" -Path "$projectRoot\backend" -Command "npm run dev" -Port 5000

# Start Customer App (Port 3000)
Start-Server -Name "Customer App" -Path "$projectRoot\frontend\customer-app" -Command "npm run dev" -Port 3000

# Start POS App (Port 3001)
Start-Server -Name "POS App" -Path "$projectRoot\frontend\pos-app" -Command "npm run dev" -Port 3001

# Start KDS App (Port 3002)
Start-Server -Name "KDS App" -Path "$projectRoot\frontend\kds-app" -Command "npm run dev" -Port 3002

# Start Admin App (Port 3003)
Start-Server -Name "Admin App" -Path "$projectRoot\frontend\admin-app" -Command "npm run dev" -Port 3003

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

