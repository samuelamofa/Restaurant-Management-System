# Vercel Deployment Guide

This guide covers deploying the De Fusion Flame Kitchen RMS to Vercel.

## Project Structure

This is a monorepo with npm workspaces:
- `backend/` - Express + Prisma backend (deployed as serverless functions)
- `frontend/customer-app/` - Next.js customer-facing app
- `frontend/pos-app/` - Next.js POS app
- `frontend/kds-app/` - Next.js Kitchen Display System
- `frontend/admin-app/` - Next.js admin dashboard

## Deployment Strategy

**IMPORTANT:** For a monorepo with multiple apps, you need to create **separate Vercel projects** for each app. Vercel cannot auto-detect multiple Next.js apps in a single project.

### Step-by-Step: Creating Separate Projects

You'll need to create **5 separate Vercel projects**:
1. Backend API (serverless functions)
2. Customer App (Next.js)
3. POS App (Next.js)
4. KDS App (Next.js)
5. Admin App (Next.js)

### Option 1: Backend API Project

Deploy the backend API as a Vercel project:

1. **Go to Vercel Dashboard** → **Add New Project**
2. **Import Git Repository** → Select your repository
3. **Configure Project:**
   - **Project Name:** `rms-backend` (or your preferred name)
   - **Root Directory:** Leave as root (`.`)
   - **Framework Preset:** Other
   - **Build Command:** `cd backend && npm run build`
   - **Output Directory:** (leave empty - serverless functions don't need output)
   - **Install Command:** `npm install`
4. **Add Environment Variables** (see below)
5. **Deploy**

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
FRONTEND_CUSTOMER_URL=https://your-customer-app.vercel.app
FRONTEND_POS_URL=https://your-pos-app.vercel.app
FRONTEND_KDS_URL=https://your-kds-app.vercel.app
FRONTEND_ADMIN_URL=https://your-admin-app.vercel.app
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

### Option 2: Customer App Project

1. **Go to Vercel Dashboard** → **Add New Project**
2. **Import Git Repository** → Select the **same repository**
3. **Configure Project:**
   - **Project Name:** `rms-customer-app` (or your preferred name)
   - **Root Directory:** `frontend/customer-app` ⚠️ **IMPORTANT: Set this!**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Build Command:** (leave default - Next.js handles this)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install` (from root, workspaces will handle it)
4. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-api.vercel.app/api
   NEXT_PUBLIC_WS_URL=https://your-backend-api.vercel.app
   ```
5. **Deploy**

### Option 3: POS App Project

1. **Go to Vercel Dashboard** → **Add New Project**
2. **Import Git Repository** → Select the **same repository**
3. **Configure Project:**
   - **Project Name:** `rms-pos-app`
   - **Root Directory:** `frontend/pos-app` ⚠️ **IMPORTANT: Set this!**
   - **Framework Preset:** Next.js
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install`
4. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-api.vercel.app/api
   NEXT_PUBLIC_WS_URL=https://your-backend-api.vercel.app
   ```
5. **Deploy**

### Option 4: KDS App Project

1. **Go to Vercel Dashboard** → **Add New Project**
2. **Import Git Repository** → Select the **same repository**
3. **Configure Project:**
   - **Project Name:** `rms-kds-app`
   - **Root Directory:** `frontend/kds-app` ⚠️ **IMPORTANT: Set this!**
   - **Framework Preset:** Next.js
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install`
4. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-api.vercel.app/api
   NEXT_PUBLIC_WS_URL=https://your-backend-api.vercel.app
   ```
5. **Deploy**

### Option 5: Admin App Project

1. **Go to Vercel Dashboard** → **Add New Project**
2. **Import Git Repository** → Select the **same repository**
3. **Configure Project:**
   - **Project Name:** `rms-admin-app`
   - **Root Directory:** `frontend/admin-app` ⚠️ **IMPORTANT: Set this!**
   - **Framework Preset:** Next.js
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install`
4. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-api.vercel.app/api
   NEXT_PUBLIC_WS_URL=https://your-backend-api.vercel.app
   ```
5. **Deploy**

## ⚠️ Important: Root Directory Configuration

**The key to making this work is setting the correct Root Directory for each project:**

- **Backend API:** Root directory = `.` (root of repo)
- **Customer App:** Root directory = `frontend/customer-app`
- **POS App:** Root directory = `frontend/pos-app`
- **KDS App:** Root directory = `frontend/kds-app`
- **Admin App:** Root directory = `frontend/admin-app`

When you import the repository, Vercel will show a "Root Directory" field. **You must set this correctly** for each project, otherwise Vercel won't find the app.

### ⚠️ Install Command for Monorepo

Since this is an npm workspace monorepo, you have two options for the Install Command:

**Option A: Install from root (Recommended)**
- **Install Command:** `npm install` (from repository root)
- This installs all workspace dependencies
- Works for all apps

**Option B: Install from app directory**
- **Install Command:** `cd frontend/customer-app && npm install`
- Only installs dependencies for that specific app
- May miss shared dependencies

**For the backend API project:**
- **Install Command:** `npm install` (from root, since backend is a workspace)

**For frontend apps:**
- **Install Command:** `npm install` (from root) OR `cd frontend/customer-app && npm install`
- Both should work, but installing from root is safer for workspace dependencies

## Database Setup

### PostgreSQL Database

1. **Set up PostgreSQL database:**
   - Use Vercel Postgres, Supabase, Neon, or any PostgreSQL provider
   - Copy the connection string

2. **Set DATABASE_URL:**
   - Add `DATABASE_URL` to Vercel Environment Variables
   - Format: `postgresql://user:password@host:port/database?schema=public`

### Running Migrations

**Option 1: Via Build Command (Recommended)**
Add to Vercel build command:
```bash
cd backend && npm run build && npx prisma migrate deploy
```

**Option 2: Manual Migration**
Run migrations manually after deployment:
```bash
cd backend
npx prisma migrate deploy
```

**Option 3: Via Vercel CLI**
```bash
vercel env pull
cd backend
npx prisma migrate deploy
```

## Important Notes

### Serverless Functions

- The backend API is deployed as Vercel serverless functions
- Each API route (`/api/*`) is handled by a serverless function
- Socket.io is not supported in serverless functions (real-time features will be limited)
- Database connections are handled per-request

### File Uploads

- File uploads are stored in `backend/uploads/` directory
- On Vercel, use Vercel Blob Storage or similar for persistent file storage
- Update upload routes to use cloud storage instead of local filesystem

### CORS Configuration

- Backend CORS is configured using `FRONTEND_*_URL` environment variables
- Make sure all frontend URLs are set in backend environment variables
- Update CORS origins to match your deployed frontend URLs

### Paystack Webhooks

- Configure webhook URL in Paystack dashboard: `https://your-api.vercel.app/api/webhooks/paystack`
- Use the `PAYSTACK_WEBHOOK_SECRET` from Paystack dashboard
- Webhook uses raw body middleware for signature verification

### Environment Variables

All environment variables should be set in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all required variables for each environment (Production, Preview, Development)

## Build Process

1. **Install dependencies:** `npm install`
2. **Generate Prisma Client:** `cd backend && npm run build`
3. **Run migrations:** `cd backend && npx prisma migrate deploy` (if not in build command)
4. **Build frontend apps:** Each app builds independently

## Troubleshooting

### Build Failures

- Ensure all environment variables are set correctly
- Check that DATABASE_URL is valid PostgreSQL connection string
- Verify npm workspaces are resolving correctly
- Check Vercel build logs for specific errors

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check that PostgreSQL database is accessible from Vercel
- Ensure migrations have been applied
- Check Vercel function logs for connection errors

### API Route Issues

- Verify API routes are accessible at `/api/*`
- Check CORS configuration matches frontend URLs
- Ensure environment variables are set correctly

### Socket.io Limitations

- Socket.io does not work in serverless functions
- Real-time features will be limited
- Consider using Vercel's Edge Functions or external WebSocket service for real-time features

## Production Checklist

- [ ] PostgreSQL database deployed and connected
- [ ] Backend API deployed with all environment variables
- [ ] All 4 frontend apps deployed with correct API URLs
- [ ] CORS origins configured in backend
- [ ] Paystack webhook configured and tested
- [ ] JWT_SECRET is a secure random string
- [ ] All frontend URLs are HTTPS
- [ ] Database migrations applied successfully
- [ ] File uploads configured (Vercel Blob or similar)
- [ ] Environment variables set for all environments

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

