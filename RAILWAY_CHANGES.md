# Railway Deployment Changes Summary

This document summarizes all changes made to prepare the project for Railway deployment.

## ✅ Completed Changes

### 1. Prisma Schema (backend/prisma/schema.prisma)
- **Changed:** Database provider from `sqlite` to `postgresql`
- **Reason:** Railway uses PostgreSQL, not SQLite
- **Impact:** Production deployments will use PostgreSQL automatically

### 2. Backend Package.json (backend/package.json)
- **Added:** `build` script: `prisma generate && prisma migrate deploy`
- **Reason:** Railway needs a build step to generate Prisma client and run migrations
- **Impact:** Migrations run automatically during Railway build

### 3. Backend Server (backend/server.js)
- **Updated:** PORT usage - already using `process.env.PORT` (verified)
- **Added:** `app.set('trust proxy', 1)` for Railway proxy
- **Updated:** Socket.io configuration with Railway proxy compatibility:
  - Added `transports: ['websocket', 'polling']`
  - Added `trustProxy: true`
  - Added `allowEIO3: true`
- **Added:** Graceful shutdown handlers for SIGTERM and SIGINT
- **Updated:** Log messages to remove localhost references in production
- **Impact:** Server works correctly behind Railway proxy, WebSockets work, graceful shutdown on Railway restarts

### 4. Database Config (backend/config/database.js)
- **Removed:** Duplicate SIGTERM/SIGINT handlers (moved to server.js)
- **Reason:** Avoid conflicts - server.js handles full graceful shutdown
- **Impact:** Clean shutdown process without conflicts

### 5. Frontend Apps - Package.json
All 4 frontend apps (customer-app, pos-app, kds-app, admin-app):
- **Verified:** `start` script uses `next start` (Next.js automatically binds to 0.0.0.0 when PORT is set)
- **Reason:** Next.js handles Railway's PORT assignment automatically
- **Impact:** Apps accessible from Railway's network

### 6. Frontend Apps - Next.js Config
All 4 frontend apps:
- **Added:** `output: 'standalone'` to next.config.js
- **Reason:** Better performance and smaller Docker images on Railway
- **Impact:** Faster builds and deployments

### 7. Customer App - Next.js Config (frontend/customer-app/next.config.js)
- **Updated:** Image remotePatterns to allow all domains (not just localhost)
- **Reason:** API URL is dynamic from environment variables
- **Impact:** Images load correctly from Railway backend

### 8. Deployment Documentation
- **Created:** `RAILWAY_DEPLOYMENT.md` with complete deployment guide
- **Includes:** Step-by-step instructions for all 5 services
- **Includes:** Environment variables for each service
- **Includes:** Troubleshooting guide

## 🔍 Verified Working

### Already Correct (No Changes Needed)
1. ✅ Paystack webhook uses `express.raw()` middleware for signature verification
2. ✅ All frontend apps use `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
3. ✅ Backend uses `process.env.PORT` correctly
4. ✅ Prisma uses `DATABASE_URL` from environment
5. ✅ npm workspaces are configured correctly
6. ✅ package-lock.json files exist where needed
7. ✅ CORS configuration uses environment variables
8. ✅ JWT authentication uses environment variables

## 📋 Environment Variables Required

### Backend Service
- `DATABASE_URL` - PostgreSQL connection string from Railway
- `PORT` - Auto-set by Railway
- `NODE_ENV=production`
- `JWT_SECRET` - Secure random string
- `JWT_EXPIRE=7d`
- `FRONTEND_CUSTOMER_URL` - Railway URL of customer app
- `FRONTEND_POS_URL` - Railway URL of POS app
- `FRONTEND_KDS_URL` - Railway URL of KDS app
- `FRONTEND_ADMIN_URL` - Railway URL of admin app
- `PAYSTACK_SECRET_KEY` - From Paystack dashboard
- `PAYSTACK_PUBLIC_KEY` - From Paystack dashboard
- `PAYSTACK_WEBHOOK_SECRET` - From Paystack dashboard

### Frontend Services (All 4 apps)
- `NEXT_PUBLIC_API_URL` - Backend Railway URL + `/api`
- `NEXT_PUBLIC_WS_URL` - Backend Railway URL (without `/api`)
- `PORT` - Auto-set by Railway

## 🚀 Deployment Commands

### Backend
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

### Frontend Apps (All 4)
- **Root Directory:** `frontend/{app-name}`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

## ✨ Key Features for Railway

1. **Automatic Port Assignment** - All services use `process.env.PORT`
2. **PostgreSQL Ready** - Prisma configured for PostgreSQL
3. **WebSocket Support** - Socket.io configured for Railway proxy
4. **Graceful Shutdown** - Proper cleanup on Railway restarts
5. **Standalone Builds** - Next.js apps use standalone output
6. **Environment-Based Config** - No hardcoded URLs or ports
7. **Migration Automation** - Prisma migrations run during build

## 📝 Notes

- Railway automatically detects Node.js projects
- No `railway.json` needed - Railway uses package.json scripts
- Each service is deployed independently
- WebSockets work automatically with Railway's proxy
- File uploads persist in Railway's filesystem

