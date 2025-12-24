# 🚀 Production Deployment Guide

## De Fusion Flame Kitchen RMS - Zero-Config Deployment

This guide provides step-by-step instructions for deploying the Restaurant Management System to production using **Railway** (backend) and **Vercel** (frontend apps).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Production Checklist](#production-checklist)

---

## Prerequisites

- GitHub account (for repository hosting)
- Railway account ([railway.app](https://railway.app))
- Vercel account ([vercel.com](https://vercel.com))
- Paystack account (for payment processing)
- PostgreSQL database (Railway provides this)

---

## Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository
5. Railway will detect the monorepo structure

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for PostgreSQL to provision
4. Click on the PostgreSQL service
5. Go to **"Variables"** tab
6. Copy the `DATABASE_URL` value (you'll need this)

### Step 3: Configure Backend Service

1. Railway should auto-detect the backend service
2. If not, click **"+ New"** → **"GitHub Repo"** → Select this repo
3. In the backend service settings:
   - **Root Directory**: Set to `backend`
   - **Start Command**: `npm start` (auto-detected)
   - **Build Command**: Not needed (we use `postinstall`)

### Step 4: Set Environment Variables

Go to your backend service → **"Variables"** tab and add:

```bash
# Database (from PostgreSQL service)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-key-here

# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=production

# CORS Origins (add your Vercel URLs after deploying frontend)
FRONTEND_CUSTOMER_URL=https://your-customer-app.vercel.app
FRONTEND_POS_URL=https://your-pos-app.vercel.app
FRONTEND_KDS_URL=https://your-kds-app.vercel.app
FRONTEND_ADMIN_URL=https://your-admin-app.vercel.app

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```

**Important Notes:**
- `DATABASE_URL` comes from your PostgreSQL service variables
- Generate `JWT_SECRET` using: `openssl rand -base64 32`
- Update CORS origins after deploying frontend apps
- Use **live** Paystack keys for production (not test keys)

### Step 5: Deploy

1. Railway will automatically deploy on every push to your main branch
2. Or click **"Deploy"** manually
3. Wait for deployment to complete
4. Copy your backend URL (e.g., `https://your-backend.railway.app`)

### Step 6: Configure Paystack Webhook

1. Go to your Paystack Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://your-backend.railway.app/api/webhooks/paystack`
3. Copy the webhook secret and add it to Railway variables as `PAYSTACK_WEBHOOK_SECRET`

---

## Frontend Deployment (Vercel)

Deploy each Next.js app separately to Vercel.

### Customer App Deployment

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend/customer-app`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
   ```
6. Click **"Deploy"**
7. Copy the deployment URL (e.g., `https://customer-app.vercel.app`)

### POS App Deployment

Repeat the same process:
- **Root Directory**: `frontend/pos-app`
- Same environment variables as customer app

### KDS App Deployment

Repeat the same process:
- **Root Directory**: `frontend/kds-app`
- Same environment variables as customer app

### Admin App Deployment

Repeat the same process:
- **Root Directory**: `frontend/admin-app`
- Same environment variables as customer app

### Update Backend CORS Origins

After deploying all frontend apps, update your Railway backend variables:

```bash
FRONTEND_CUSTOMER_URL=https://your-customer-app.vercel.app
FRONTEND_POS_URL=https://your-pos-app.vercel.app
FRONTEND_KDS_URL=https://your-kds-app.vercel.app
FRONTEND_ADMIN_URL=https://your-admin-app.vercel.app
```

Railway will automatically redeploy with the new CORS settings.

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ Yes | Secret for JWT token signing | `openssl rand -base64 32` |
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | ❌ No | Server port (Railway auto-assigns) | `5000` |
| `HOST` | ❌ No | Server host (defaults to 0.0.0.0) | `0.0.0.0` |
| `FRONTEND_CUSTOMER_URL` | ✅ Yes | Customer app URL | `https://customer.vercel.app` |
| `FRONTEND_POS_URL` | ✅ Yes | POS app URL | `https://pos.vercel.app` |
| `FRONTEND_KDS_URL` | ✅ Yes | KDS app URL | `https://kds.vercel.app` |
| `FRONTEND_ADMIN_URL` | ✅ Yes | Admin app URL | `https://admin.vercel.app` |
| `PAYSTACK_SECRET_KEY` | ✅ Yes | Paystack secret key | `sk_live_...` |
| `PAYSTACK_PUBLIC_KEY` | ✅ Yes | Paystack public key | `pk_live_...` |
| `PAYSTACK_WEBHOOK_SECRET` | ✅ Yes | Paystack webhook secret | `whsec_...` |

### Frontend Apps (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API URL | `https://backend.railway.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ Yes | WebSocket URL | `https://backend.railway.app` |

**Note:** All `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets here.

---

## Post-Deployment Verification

### 1. Backend Health Check

```bash
curl https://your-backend.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Test API Endpoint

```bash
curl https://your-backend.railway.app/api/menu
```

Should return menu items (or empty array if no data).

### 3. Test Frontend Apps

1. Open each frontend app URL
2. Check browser console for errors
3. Verify API calls are working
4. Test Socket.io connections (real-time features)

### 4. Test Authentication

1. Try logging in to each app
2. Verify JWT tokens are working
3. Check that protected routes require authentication

### 5. Test Payments (Paystack)

1. Create a test order in customer app
2. Complete payment flow
3. Verify webhook receives payment confirmation
4. Check order status updates in real-time

---

## Common Issues & Solutions

### Issue: Backend fails to start on Railway

**Symptoms:**
- Deployment shows "Build Succeeded" but service crashes
- Logs show database connection errors

**Solutions:**
1. Verify `DATABASE_URL` is correctly set (from PostgreSQL service)
2. Check that `JWT_SECRET` is set
3. Ensure `NODE_ENV=production` is set
4. Check Railway logs for specific error messages

### Issue: CORS errors in browser

**Symptoms:**
- Browser console shows CORS policy errors
- API requests fail with CORS errors

**Solutions:**
1. Verify all `FRONTEND_*_URL` variables are set in Railway
2. Ensure URLs match exactly (no trailing slashes)
3. Check that frontend apps are using correct `NEXT_PUBLIC_API_URL`
4. Redeploy backend after updating CORS variables

### Issue: Socket.io connection fails

**Symptoms:**
- Real-time features not working
- WebSocket connection errors in console

**Solutions:**
1. Verify `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
2. Ensure Socket.io URL matches backend URL (without `/api`)
3. Check Railway logs for Socket.io connection errors
4. Verify CORS allows WebSocket connections

### Issue: Prisma migration errors

**Symptoms:**
- Deployment fails during `prestart` script
- Database schema errors

**Solutions:**
1. Check `DATABASE_URL` is valid PostgreSQL URL
2. Verify database is accessible from Railway
3. Check migration files are present in `backend/prisma/migrations`
4. If switching from SQLite, ensure `schema.prisma` uses `provider = "postgresql"`

### Issue: Images not loading

**Symptoms:**
- Menu item images show broken links
- Uploaded images not displaying

**Solutions:**
1. Verify `uploads` directory exists (created automatically)
2. Check image URLs in database point to correct backend URL
3. Ensure CORS allows image requests
4. Check Railway file system persistence (uploads may be lost on redeploy - consider using S3)

### Issue: Paystack webhooks not working

**Symptoms:**
- Payments complete but orders not updating
- Webhook logs show errors

**Solutions:**
1. Verify `PAYSTACK_WEBHOOK_SECRET` matches Paystack dashboard
2. Check webhook URL in Paystack: `https://your-backend.railway.app/api/webhooks/paystack`
3. Ensure webhook is enabled in Paystack dashboard
4. Check Railway logs for webhook processing errors

### Issue: Frontend build fails on Vercel

**Symptoms:**
- Vercel deployment shows build errors
- Missing dependencies

**Solutions:**
1. Verify `Root Directory` is set correctly (e.g., `frontend/customer-app`)
2. Check that `package.json` exists in root directory
3. Ensure all dependencies are in `package.json`
4. Check Vercel build logs for specific errors

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables documented
- [ ] Paystack account configured with live keys
- [ ] PostgreSQL database provisioned
- [ ] JWT secret generated securely
- [ ] All hardcoded URLs removed from code
- [ ] CORS origins configured
- [ ] Webhook secrets configured

### Backend Deployment

- [ ] Railway project created
- [ ] PostgreSQL service added
- [ ] Backend service configured with correct root directory
- [ ] All environment variables set
- [ ] Deployment successful
- [ ] Health check endpoint working
- [ ] Database migrations completed
- [ ] Prisma client generated

### Frontend Deployment

- [ ] Customer app deployed to Vercel
- [ ] POS app deployed to Vercel
- [ ] KDS app deployed to Vercel
- [ ] Admin app deployed to Vercel
- [ ] All environment variables set in each app
- [ ] All apps build successfully
- [ ] All apps accessible via HTTPS

### Post-Deployment

- [ ] Backend CORS updated with frontend URLs
- [ ] Paystack webhook configured
- [ ] Authentication tested on all apps
- [ ] Real-time features (Socket.io) tested
- [ ] Payment flow tested end-to-end
- [ ] Image uploads working
- [ ] All apps accessible and functional

### Security

- [ ] No secrets in frontend code
- [ ] JWT secret is strong and secure
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] Paystack webhook signature verification working
- [ ] SQLite disabled in production (PostgreSQL only)

---

## Additional Notes

### Railway Considerations

- **File Uploads**: Railway's file system is ephemeral. Uploaded images will be lost on redeploy. Consider using:
  - AWS S3
  - Cloudinary
  - Railway Volume (persistent storage)
- **Database Backups**: Configure automatic backups in Railway PostgreSQL settings
- **Custom Domain**: Add custom domain in Railway service settings

### Vercel Considerations

- **Build Time**: Each app builds independently
- **Environment Variables**: Set per-project in Vercel dashboard
- **Custom Domains**: Add custom domains in Vercel project settings
- **Preview Deployments**: Each PR creates a preview deployment (useful for testing)

### Monitoring

- **Railway Logs**: Monitor backend logs in Railway dashboard
- **Vercel Analytics**: Enable Vercel Analytics for frontend monitoring
- **Error Tracking**: Consider adding Sentry or similar service
- **Uptime Monitoring**: Use UptimeRobot or similar for health checks

### Scaling

- **Railway**: Auto-scales based on traffic
- **Vercel**: Handles scaling automatically
- **Database**: Monitor PostgreSQL connection limits
- **Socket.io**: Consider Redis adapter for multi-instance deployments

---

## Support

For issues or questions:
1. Check Railway logs for backend errors
2. Check Vercel build logs for frontend errors
3. Review this documentation
4. Check GitHub issues (if public repo)

---

## Quick Reference

### Backend URL Format
```
https://your-backend.railway.app
```

### Frontend URL Format
```
https://your-app.vercel.app
```

### API Endpoint Format
```
https://your-backend.railway.app/api/{endpoint}
```

### WebSocket URL Format
```
https://your-backend.railway.app
```

---

**Last Updated:** 2024-01-01
**Version:** 1.0.0

