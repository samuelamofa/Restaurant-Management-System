# Railway Database Setup Guide

This guide explains how to set up PostgreSQL database on Railway for your backend service.

## 🗄️ Setting Up PostgreSQL on Railway

### Step 1: Create PostgreSQL Service

1. Go to your Railway project dashboard
2. Click **+ New** → **Database** → **Add PostgreSQL**
3. Railway will automatically create a PostgreSQL database for you
4. Wait for the database to be provisioned (takes ~1-2 minutes)

### Step 2: Get DATABASE_URL

1. Click on your **PostgreSQL** service in Railway
2. Go to the **Variables** tab
3. You'll see a variable called `DATABASE_URL` - this is your connection string
4. It looks like: `postgresql://postgres:password@hostname:5432/railway`

### Step 3: Connect Backend to Database

1. Go to your **Backend** service in Railway
2. Click on **Variables** tab
3. Click **+ New Variable**
4. Add:
   - **Name:** `DATABASE_URL`
   - **Value:** Copy the `DATABASE_URL` from your PostgreSQL service
5. Click **Add**

**Important:** You can also use Railway's **Reference** feature:
- When adding the variable, click **Reference** instead of typing
- Select your PostgreSQL service
- Select `DATABASE_URL`
- This automatically syncs the value

### Step 4: Run Migrations

After setting `DATABASE_URL`, Railway will automatically:
1. Run `npm run prestart` (which runs `prisma generate`)
2. Start your server

However, you need to run migrations manually the first time:

#### Option 1: Using Railway CLI (Recommended)

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link your project: `railway link`
4. Run migrations:
   ```bash
   railway run --service backend npx prisma migrate deploy
   ```

#### Option 2: Using Railway Dashboard

1. Go to your backend service
2. Click on **Deployments** tab
3. Click on the latest deployment
4. Click **View Logs**
5. You can run commands in the logs, or use Railway's **Shell** feature

#### Option 3: Add Migration to Build Process

Add this to your `backend/package.json`:

```json
{
  "scripts": {
    "prestart": "npx prisma generate && npx prisma migrate deploy",
    "start": "node server.js"
  }
}
```

**Note:** This will run migrations on every deploy, which is safe for production.

### Step 5: Verify Connection

After setting up, check your Railway backend logs. You should see:
```
✅ Database connected successfully
```

If you see connection errors, verify:
- `DATABASE_URL` is set correctly in backend service variables
- PostgreSQL service is running
- The connection string format is correct

## 🔄 Migration from SQLite to PostgreSQL

If you were using SQLite locally and now moving to PostgreSQL:

1. **Backup your SQLite data** (if needed):
   ```bash
   cp backend/prisma/dev.db backend/prisma/dev.db.backup
   ```

2. **Update Prisma schema** (already done - provider is now "postgresql")

3. **Generate Prisma client:**
   ```bash
   cd backend
   npx prisma generate
   ```

4. **Run migrations on Railway:**
   ```bash
   railway run --service backend npx prisma migrate deploy
   ```

5. **Seed database (optional):**
   ```bash
   railway run --service backend npm run seed:production
   ```

## 📝 Environment Variables Checklist

Make sure these are set in your Railway backend service:

- ✅ `DATABASE_URL` - From PostgreSQL service
- ✅ `JWT_SECRET` - Generated secret
- ✅ `JWT_EXPIRE` - Usually `7d`
- ✅ `PAYSTACK_SECRET_KEY` - Your Paystack secret key
- ✅ `PAYSTACK_PUBLIC_KEY` - Your Paystack public key
- ✅ `PAYSTACK_WEBHOOK_SECRET` - Your Paystack webhook secret
- ✅ `FRONTEND_CUSTOMER_URL` - Your customer app URL
- ✅ `FRONTEND_POS_URL` - Your POS app URL
- ✅ `FRONTEND_KDS_URL` - Your KDS app URL
- ✅ `FRONTEND_ADMIN_URL` - Your admin app URL

## 🐛 Troubleshooting

### "Environment variable not found: DATABASE_URL"

**Solution:**
1. Go to Railway → Your backend service → Variables
2. Add `DATABASE_URL` variable
3. Use the value from your PostgreSQL service
4. Redeploy your backend service

### "Database connection error"

**Check:**
1. PostgreSQL service is running (green status in Railway)
2. `DATABASE_URL` is correctly formatted
3. Database credentials are correct
4. Network connectivity (Railway handles this automatically)

### "Migration failed"

**Solution:**
1. Check that `DATABASE_URL` is set correctly
2. Ensure PostgreSQL service is running
3. Try running migrations manually:
   ```bash
   railway run --service backend npx prisma migrate deploy
   ```

### Local Development with SQLite

If you want to use SQLite for local development:

1. Create a separate `schema.prisma` for local, OR
2. Change the provider in `schema.prisma` to `"sqlite"` when developing locally
3. Set `DATABASE_URL=file:./prisma/dev.db` in your local `.env`

**Note:** The production schema now uses PostgreSQL, which is required for Railway.

## ✅ Verification

After setup, verify everything works:

1. Check Railway backend logs - should see "✅ Database connected successfully"
2. Try making an API call to your backend
3. Check that data persists (create a test order, refresh, verify it's still there)

Your database is now ready for production! 🚀

