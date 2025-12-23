# Railway Deployment Configuration

This project is configured to deploy the backend service on Railway.

## Configuration Steps

### 1. Set Root Directory in Railway Dashboard

1. Go to your Railway project dashboard
2. Select your backend service
3. Go to **Settings** → **Service Settings**
4. Under **Root Directory**, set it to: `backend`
5. Save the changes

### 2. Build Configuration

Railway will automatically:
- Detect Node.js from `backend/package.json`
- Use `npm ci` to install dependencies (requires `backend/package-lock.json`)
- Run `npm run prestart` (generates Prisma client)
- Run `npm start` to start the server

### 3. Environment Variables (REQUIRED)

**⚠️ CRITICAL: The application will not start without these environment variables!**

Set the following environment variables in Railway dashboard:

1. Go to your Railway service
2. Click on **Variables** tab
3. Add each variable below:

#### Required Variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT Authentication (REQUIRED)
# Generate a strong secret: openssl rand -base64 32
JWT_SECRET=your-strong-random-secret-min-32-characters
JWT_EXPIRE=7d

# Paystack (REQUIRED for payments)
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_from_paystack

# Frontend URLs (REQUIRED for CORS)
FRONTEND_CUSTOMER_URL=https://your-domain.com
FRONTEND_POS_URL=https://pos.your-domain.com
FRONTEND_KDS_URL=https://kds.your-domain.com
FRONTEND_ADMIN_URL=https://admin.your-domain.com

# Restaurant Info (Optional but recommended)
RESTAURANT_NAME=De Fusion Flame Kitchen
RESTAURANT_ADDRESS=Kasoa New Market Road Opposite Saviour Diagnostic Clinic
RESTAURANT_PHONE=0551796725,0545010103
```

#### Quick Setup:

1. **Generate JWT_SECRET:**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and use it as `JWT_SECRET`

2. **Get DATABASE_URL:**
   - If using Railway PostgreSQL: Go to your PostgreSQL service → Variables → Copy `DATABASE_URL`
   - If using external database: Format as `postgresql://user:password@host:port/database?schema=public`

3. **Get Paystack Keys:**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com)
   - Settings → API Keys & Webhooks
   - Copy your LIVE keys (not test keys!)

4. **Set Frontend URLs:**
   - Use your actual production domain URLs
   - Must include `https://` protocol

### 4. Database Setup

Railway will automatically run Prisma migrations if configured. Alternatively, you can run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Files

- `railway.toml` - Railway deployment configuration
- `backend/package-lock.json` - Lock file for reproducible builds
- `backend/package.json` - Backend dependencies and scripts

## Troubleshooting

### Build Issues

**"npm ci can only install with an existing package-lock.json":**
- Ensure `backend/package-lock.json` is committed to git
- Verify the root directory is set to `backend` in Railway dashboard
- Check that `.gitignore` doesn't exclude `backend/package-lock.json`

### Runtime Issues

**"JWT_SECRET is not set in environment variables":**
- Go to Railway dashboard → Your service → Variables tab
- Add `JWT_SECRET` variable with a strong random value
- Generate one: `openssl rand -base64 32`
- Redeploy the service

**"Database connection error":**
- Verify `DATABASE_URL` is set correctly in Railway Variables
- Check that your PostgreSQL service is running
- Ensure the database exists and credentials are correct
- Test connection: Railway provides a database URL in the PostgreSQL service variables

**Application keeps restarting:**
- Check Railway logs for error messages
- Verify all required environment variables are set
- Ensure `DATABASE_URL` points to a valid database
- Check that `JWT_SECRET` is set and not empty

