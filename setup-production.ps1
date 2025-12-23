# Production Setup Script for De Fusion Flame RMS
# This script sets up the system for PRODUCTION deployment

Write-Host "🚀 Setting up PRODUCTION version of De Fusion Flame RMS..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

Set-Location $projectRoot

# Step 1: Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node -v
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Check for PostgreSQL
Write-Host ""
Write-Host "⚠️  PRODUCTION REQUIREMENTS:" -ForegroundColor Yellow
Write-Host "   1. PostgreSQL database must be set up and running" -ForegroundColor Yellow
Write-Host "   2. Database connection string must be configured" -ForegroundColor Yellow
Write-Host "   3. Paystack LIVE API keys must be configured" -ForegroundColor Yellow
Write-Host "   4. Strong JWT secret must be generated" -ForegroundColor Yellow
Write-Host "   5. Production domain URLs must be configured" -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Have you completed all requirements? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "❌ Setup cancelled. Please complete requirements first." -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "📦 Installing production dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

# Step 3: Setup production environment
Write-Host ""
Write-Host "⚙️  Setting up production environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    Write-Host "   Please review and update your .env file with production values" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Required variables:" -ForegroundColor Cyan
    Write-Host "   - DATABASE_URL (PostgreSQL connection string)" -ForegroundColor Cyan
    Write-Host "   - JWT_SECRET (strong random secret, min 32 chars)" -ForegroundColor Cyan
    Write-Host "   - PAYSTACK_SECRET_KEY (LIVE key)" -ForegroundColor Cyan
    Write-Host "   - PAYSTACK_PUBLIC_KEY (LIVE key)" -ForegroundColor Cyan
    Write-Host "   - FRONTEND_*_URL (production domain URLs)" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Continue with existing .env? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Setup cancelled. Please configure .env file first." -ForegroundColor Red
        exit 1
    }
} else {
    # Create .env.production template if it doesn't exist
    if (-not (Test-Path ".env.production")) {
        Write-Host "   Creating .env.production template..." -ForegroundColor Cyan
        $envTemplate = @"
# Production Environment Variables Template
# Copy this file to .env and update with your production values

# Server Configuration
PORT=5000
NODE_ENV=production

# Database - PostgreSQL (REQUIRED for production)
# Format: postgresql://user:password@host:port/database?schema=public
DATABASE_URL="postgresql://user:password@localhost:5432/de_fusion_flame?schema=public"

# JWT Authentication (REQUIRED)
# Generate a strong random secret: openssl rand -base64 32
JWT_SECRET=CHANGE_THIS_TO_STRONG_RANDOM_SECRET
JWT_EXPIRE=7d

# Paystack Configuration (REQUIRED for payments)
# Use LIVE keys from https://dashboard.paystack.com
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_from_paystack

# Frontend URLs (REQUIRED for CORS)
# Update with your production domain URLs
FRONTEND_CUSTOMER_URL=https://your-domain.com
FRONTEND_POS_URL=https://pos.your-domain.com
FRONTEND_KDS_URL=https://kds.your-domain.com
FRONTEND_ADMIN_URL=https://admin.your-domain.com

# Restaurant Information (Optional - can be set in admin dashboard)
RESTAURANT_NAME=De Fusion Flame Kitchen
RESTAURANT_ADDRESS=Kasoa New Market Road Opposite Saviour Diagnostic Clinic
RESTAURANT_PHONE=0551796725,0545010103
"@
        Set-Content -Path ".env.production" -Value $envTemplate
        Write-Host "   ✅ Template created" -ForegroundColor Green
    }
    
    Copy-Item ".env.production" ".env" -Force
    Write-Host "✅ Production environment template created" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Update .env file with your production values!" -ForegroundColor Red
    Write-Host "   Edit backend/.env and configure all required variables" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Have you updated .env with production values? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Setup cancelled. Please configure .env file first." -ForegroundColor Red
        exit 1
    }
}

# Step 4: Generate JWT secret if not set
Write-Host ""
Write-Host "🔐 Checking JWT secret..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw
if ($envContent -match "CHANGE_THIS_TO_STRONG_RANDOM_SECRET") {
    Write-Host "⚠️  JWT_SECRET needs to be changed!" -ForegroundColor Red
    Write-Host "   Generating a random secret..." -ForegroundColor Yellow
    
    # Generate random secret
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$secret"
    Set-Content ".env" $envContent
    Write-Host "✅ JWT secret generated and saved" -ForegroundColor Green
} else {
    Write-Host "✅ JWT secret is configured" -ForegroundColor Green
}

# Step 5: Setup database
Write-Host ""
Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# Run production migrations
Write-Host "   Running database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to run migrations" -ForegroundColor Red
    Write-Host "   Please check your DATABASE_URL in .env" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Database migrations completed" -ForegroundColor Green

# Step 6: Build frontend apps
Write-Host ""
Write-Host "🏗️  Building frontend applications..." -ForegroundColor Yellow
Set-Location $projectRoot

$frontendApps = @("customer-app", "pos-app", "kds-app", "admin-app")
foreach ($app in $frontendApps) {
    $appPath = "frontend\$app"
    if (Test-Path $appPath) {
        Write-Host "   Building $app..." -ForegroundColor Cyan
        Set-Location $appPath
        
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            npm install
        }
        
        # Build for production
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Warning: Failed to build $app" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ $app built successfully" -ForegroundColor Green
        }
        
        Set-Location $projectRoot
    }
}
Write-Host "✅ Frontend applications built" -ForegroundColor Green

# Step 7: Security checklist
Write-Host ""
Write-Host "🔒 PRODUCTION SECURITY CHECKLIST:" -ForegroundColor Yellow
Write-Host "   ☐ JWT_SECRET is strong and unique" -ForegroundColor Cyan
Write-Host "   ☐ Database credentials are secure" -ForegroundColor Cyan
Write-Host "   ☐ Paystack LIVE keys are configured" -ForegroundColor Cyan
Write-Host "   ☐ CORS origins are restricted to production domains" -ForegroundColor Cyan
Write-Host "   ☐ SSL/HTTPS is configured" -ForegroundColor Cyan
Write-Host "   ☐ Rate limiting is enabled" -ForegroundColor Cyan
Write-Host "   ☐ Error logging is configured" -ForegroundColor Cyan
Write-Host "   ☐ Backup strategy is in place" -ForegroundColor Cyan
Write-Host ""

# Step 8: Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 PRODUCTION SETUP COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review and test all configurations" -ForegroundColor Cyan
Write-Host "   2. Set up process manager (PM2 recommended)" -ForegroundColor Cyan
Write-Host "   3. Configure reverse proxy (Nginx recommended)" -ForegroundColor Cyan
Write-Host "   4. Set up SSL certificates" -ForegroundColor Cyan
Write-Host "   5. Configure monitoring and logging" -ForegroundColor Cyan
Write-Host "   6. Set up automated backups" -ForegroundColor Cyan
Write-Host "   7. Create admin user via API or seed script" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 See DEPLOYMENT.md for detailed deployment instructions" -ForegroundColor Yellow
Write-Host ""

Set-Location $projectRoot

