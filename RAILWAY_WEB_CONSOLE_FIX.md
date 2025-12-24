# 🔧 Fix Migration via Railway Web Console

Since Railway CLI has limitations in non-interactive mode, here's how to fix the migration using Railway's **Web Console**:

## Step 1: Open Railway Web Console

1. Go to your Railway project: https://railway.com/project/0afb40c2-e82d-4c33-bac2-10d2f03105ab
2. Click on your **backend service** (satisfied-joy)
3. Click on the **"Deployments"** tab
4. Click on the most recent deployment
5. Click **"View Logs"** or look for a **"Shell"** or **"Console"** button

## Step 2: Open Service Shell

1. In your service page, look for a **"Shell"** or **"Console"** tab/button
2. Or click on **"Settings"** → **"Service"** → Look for shell access
3. Railway's web console will open a terminal in your service environment

## Step 3: Run Migration Commands

Once in the Railway shell, run these commands:

```bash
# Navigate to backend directory (if not already there)
cd backend

# Resolve the failed migration
npx prisma migrate resolve --rolled-back 20251221091813_init

# Retry migrations
npx prisma migrate deploy
```

## Alternative: Use Railway's One-Click Fix

If Railway's web console isn't available, you can also:

1. **Redeploy the service** - The updated prestart script should auto-fix it
2. Go to your service → **"Deployments"** → **"Redeploy"**
3. The new prestart script will automatically detect and resolve the P3009 error

## Step 4: Verify

After running the commands, check the logs to see:
```
✅ Applied migration: 20251221091813_init
✅ Applied migration: 20251221114916_add_kitchen_tracking
✅ Applied migration: 20251221161105_add_delivery_info_to_orders
✅ Applied migration: 20251222034749_add_day_session
✅ Applied migration: 20251222152247_add_paystack_keys
```

Your service should automatically restart and be ready!

---

## Quick Links

- **Your Project**: https://railway.com/project/0afb40c2-e82d-4c33-bac2-10d2f03105ab
- **Service**: satisfied-joy (backend service)

