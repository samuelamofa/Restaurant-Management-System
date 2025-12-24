# 🔧 Manual Migration Fix Guide

## Quick Fix for P3009 Failed Migration Error

This guide will help you manually resolve the failed migration error on Railway.

---

## Step 1: Install Railway CLI

If you don't have Railway CLI installed:

**Windows (PowerShell):**
```powershell
# Using Scoop (recommended)
scoop install railway

# Or using npm
npm i -g @railway/cli
```

**Mac/Linux:**
```bash
# Using Homebrew
brew install railway

# Or using npm
npm i -g @railway/cli
```

---

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate with Railway.

---

## Step 3: Link to Your Project

```bash
# Navigate to your project directory
cd "C:\Users\Zikay Tech\OneDrive\Desktop\DE FUSION FLAME SYSTEM"

# Link to your Railway project
railway link
```

Select your project from the list.

---

## Step 4: Connect to Backend Service

```bash
# Make sure you're in the backend directory
cd backend

# Or from root, specify the service
railway run --service <your-backend-service-name> bash
```

If you're not sure of the service name, you can list services:
```bash
railway status
```

---

## Step 5: Resolve the Failed Migration

Once you're in the Railway shell, run:

```bash
# Resolve the failed migration (replace with your actual migration name)
npx prisma migrate resolve --rolled-back 20251221091813_init
```

**Note:** The migration name from your error was `20251221091813_init`. If it's different, use that name.

---

## Step 6: Retry Migrations

After resolving the failed migration, retry the deployment:

```bash
# Run migrations again
npx prisma migrate deploy
```

You should see:
```
✅ Applied migration: 20251221091813_init
✅ Applied migration: 20251221114916_add_kitchen_tracking
✅ Applied migration: 20251221161105_add_delivery_info_to_orders
✅ Applied migration: 20251222034749_add_day_session
✅ Applied migration: 20251222152247_add_paystack_keys
```

---

## Alternative: Use db push (Fresh Database)

If you have a fresh database and don't need to preserve data, you can use `db push` instead:

```bash
railway run bash
cd backend
npx prisma db push --accept-data-loss --skip-generate
```

**⚠️ Warning:** This will recreate your database schema and may lose data.

---

## Step 7: Verify the Fix

After resolving, check that your service starts correctly:

```bash
# Check service logs
railway logs

# Or check the health endpoint
curl https://your-backend.railway.app/health
```

---

## Troubleshooting

### If `railway run` doesn't work:

Try using Railway's web console:
1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **"Deployments"** tab
4. Click **"Redeploy"** (the auto-fix should work now)

### If migration name is different:

Check the error message for the exact migration name. It will be in format: `YYYYMMDDHHMMSS_migration_name`

### If you get connection errors:

Make sure:
- `DATABASE_URL` is set in Railway variables
- Database service is running
- You're connected to the correct project

---

## Quick Command Reference

```bash
# Login
railway login

# Link project
railway link

# Connect to service shell
railway run bash
cd backend

# Resolve failed migration
npx prisma migrate resolve --rolled-back 20251221091813_init

# Retry migrations
npx prisma migrate deploy

# Check status
railway status

# View logs
railway logs
```

---

**Need Help?** Check the main deployment guide: `README_DEPLOYMENT.md`

