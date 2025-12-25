# Railway Deployment Guide

This guide covers deploying the De Fusion Flame Kitchen RMS to Railway.

## Project Structure

This is a monorepo with npm workspaces:
- `backend/` - Express + Prisma + Socket.io backend
- `frontend/customer-app/` - Next.js customer-facing app
- `frontend/pos-app/` - Next.js POS app
- `frontend/kds-app/` - Next.js Kitchen Display System
- `frontend/admin-app/` - Next.js admin dashboard

## Deployment Steps

### 1. Deploy PostgreSQL Database

1. Create a new PostgreSQL service in Railway
2. Copy the `DATABASE_URL` from the service variables
3. This will be used by the backend service

### 2. Deploy Backend Service

**Service Configuration:**
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@hostname:5432/database?schema=public
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
FRONTEND_CUSTOMER_URL=https://your-customer-app.railway.app
FRONTEND_POS_URL=https://your-pos-app.railway.app
FRONTEND_KDS_URL=https://your-kds-app.railway.app
FRONTEND_ADMIN_URL=https://your-admin-app.railway.app
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
RESTAURANT_NAME=De Fusion Flame Kitchen
RESTAURANT_ADDRESS=
RESTAURANT_PHONE=
ADMIN_EMAIL=admin@defusionflame.com
ADMIN_PASSWORD=admin123
ADMIN_PHONE=0551796725
```

**Notes:**
- The backend will automatically run `prisma generate` on install
- The build script runs `prisma migrate deploy` to apply migrations
- Socket.io is configured for Railway proxy compatibility
- WebSockets work automatically with Railway's proxy

### 3. Deploy Customer App

**Service Configuration:**
- **Root Directory:** `frontend/customer-app`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
PORT=3000
```

### 4. Deploy POS App

**Service Configuration:**
- **Root Directory:** `frontend/pos-app`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
PORT=3001
```

### 5. Deploy KDS App

**Service Configuration:**
- **Root Directory:** `frontend/kds-app`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
PORT=3002
```

### 6. Deploy Admin App

**Service Configuration:**
- **Root Directory:** `frontend/admin-app`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
PORT=3003
```

## Important Notes

### Database Migrations
- Migrations run automatically during backend build (`npm run build`)
- If you need to run migrations manually: `npm run migrate:deploy`

### WebSocket Support
- Socket.io is configured for Railway's proxy
- WebSockets work automatically - no additional configuration needed
- All frontend apps connect using `NEXT_PUBLIC_WS_URL`

### Paystack Webhooks
- Configure webhook URL in Paystack dashboard: `https://your-backend.railway.app/api/webhooks/paystack`
- Use the `PAYSTACK_WEBHOOK_SECRET` from Paystack dashboard
- Webhook uses raw body middleware for signature verification

### CORS Configuration
- Backend CORS is configured using `FRONTEND_*_URL` environment variables
- Make sure all frontend URLs are set in backend environment variables

### File Uploads
- Uploads are stored in `backend/uploads/` directory
- Railway provides persistent storage for this directory
- Files are served statically at `/uploads` endpoint

### Graceful Shutdown
- Backend handles SIGTERM and SIGINT signals gracefully
- Database connections are closed properly on shutdown
- Socket.io connections are closed gracefully

## Troubleshooting

### Build Failures
- Ensure all environment variables are set correctly
- Check that DATABASE_URL is valid PostgreSQL connection string
- Verify npm workspaces are resolving correctly

### WebSocket Connection Issues
- Verify `NEXT_PUBLIC_WS_URL` matches backend URL (without /api)
- Check CORS configuration in backend
- Ensure Socket.io is using correct transport methods

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check that PostgreSQL service is running
- Ensure migrations have been applied

### Port Issues
- Railway automatically assigns PORT - don't hardcode ports
- All services use `process.env.PORT` or Railway-assigned port

## Production Checklist

- [ ] PostgreSQL database deployed and connected
- [ ] Backend service deployed with all environment variables
- [ ] All 4 frontend apps deployed with correct API URLs
- [ ] CORS origins configured in backend
- [ ] Paystack webhook configured and tested
- [ ] JWT_SECRET is a secure random string
- [ ] All frontend URLs are HTTPS
- [ ] Database migrations applied successfully
- [ ] WebSocket connections working
- [ ] File uploads working

