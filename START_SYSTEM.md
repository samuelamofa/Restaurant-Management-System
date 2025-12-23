# 🚀 Quick Start Guide - Fix System Loading Issues

## Step 1: Verify Backend Setup

1. **Check if .env file exists:**
   ```powershell
   cd backend
   if (Test-Path .env) { Write-Host "✅ .env exists" } else { Write-Host "❌ .env missing" }
   ```

2. **Verify .env has required variables:**
   - `JWT_SECRET` (must be set)
   - `DATABASE_URL` (should be `file:./prisma/dev.db` for SQLite)

3. **Install backend dependencies:**
   ```powershell
   cd backend
   npm install
   ```

4. **Generate Prisma Client:**
   ```powershell
   cd backend
   npx prisma generate
   ```

5. **Run database migrations:**
   ```powershell
   cd backend
   npx prisma migrate dev
   ```

6. **Seed database (optional but recommended):**
   ```powershell
   cd backend
   npm run seed
   ```

7. **Start backend server:**
   ```powershell
   cd backend
   npm run dev
   ```
   
   You should see: `🚀 Server running on port 5000`

## Step 2: Verify Frontend Apps

For each frontend app (customer-app, pos-app, kds-app, admin-app):

1. **Install dependencies:**
   ```powershell
   cd frontend/customer-app
   npm install
   ```

2. **Start the app:**
   ```powershell
   npm run dev
   ```

## Step 3: Common Issues & Fixes

### Issue: "JWT_SECRET is not set"
**Fix:** Make sure `backend/.env` has:
```
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
```

### Issue: "Database connection error"
**Fix:** 
1. Check `DATABASE_URL` in `backend/.env` is: `file:./prisma/dev.db`
2. Run: `cd backend && npx prisma migrate dev`

### Issue: "Port already in use"
**Fix:** 
- Backend (port 5000): Find and kill process using port 5000
- Frontend apps: Each uses different port (3000, 3001, 3002, 3003)

### Issue: "Cannot find module"
**Fix:** Run `npm install` in the directory with the error

### Issue: "Prisma Client not found"
**Fix:** Run `cd backend && npx prisma generate`

## Step 4: Verify All Systems

1. **Backend Health Check:**
   Open: http://localhost:5000/health
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend Apps:**
   - Customer App: http://localhost:3000
   - POS App: http://localhost:3001
   - KDS App: http://localhost:3002
   - Admin App: http://localhost:3003

## Quick Fix Script

Run this PowerShell script to check everything:

```powershell
# Check backend
cd backend
if (-not (Test-Path .env)) { Write-Host "❌ Missing .env file" }
if (-not (Test-Path node_modules)) { Write-Host "❌ Run: npm install" }
if (-not (Test-Path "prisma\dev.db")) { Write-Host "⚠️  Run: npx prisma migrate dev" }

# Check frontend apps
$apps = @("customer-app", "pos-app", "kds-app", "admin-app")
foreach ($app in $apps) {
    $path = "..\frontend\$app\node_modules"
    if (-not (Test-Path $path)) {
        Write-Host "❌ $app: Run npm install"
    }
}
```


