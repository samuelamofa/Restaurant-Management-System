# Quick Start: Deploying to Vercel

## The Problem

When you import a monorepo with multiple apps into Vercel, it doesn't automatically detect all the apps. You need to create **separate projects** for each app.

## Solution: Create 5 Separate Vercel Projects

You need to create **5 separate Vercel projects** from the same Git repository:

1. **Backend API** - Serverless functions
2. **Customer App** - Next.js app
3. **POS App** - Next.js app  
4. **KDS App** - Next.js app
5. **Admin App** - Next.js app

## Step-by-Step Instructions

### 1. Deploy Backend API First

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. **Import Git Repository** → Select your repository
4. **Configure Project:**
   - **Project Name:** `rms-backend`
   - **Root Directory:** `.` (leave as root)
   - **Framework Preset:** Other
   - **Build Command:** `cd backend && npm run build`
   - **Output Directory:** (leave empty)
   - **Install Command:** `npm install`
5. **Add Environment Variables** (see VERCEL_DEPLOYMENT.md for full list)
6. Click **Deploy**

### 2. Deploy Customer App

1. Go to Vercel Dashboard
2. Click **"Add New Project"** (again)
3. **Import Git Repository** → Select the **same repository**
4. **Configure Project:**
   - **Project Name:** `rms-customer-app`
   - **Root Directory:** `frontend/customer-app` ⚠️ **CRITICAL: Set this!**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install`
5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://rms-backend.vercel.app/api
   NEXT_PUBLIC_WS_URL=https://rms-backend.vercel.app
   ```
6. Click **Deploy**

### 3. Deploy POS App

Repeat steps 2-6 above, but:
- **Project Name:** `rms-pos-app`
- **Root Directory:** `frontend/pos-app` ⚠️ **CRITICAL: Set this!**
- **Environment Variables:** Same as Customer App

### 4. Deploy KDS App

Repeat steps 2-6 above, but:
- **Project Name:** `rms-kds-app`
- **Root Directory:** `frontend/kds-app` ⚠️ **CRITICAL: Set this!**
- **Environment Variables:** Same as Customer App

### 5. Deploy Admin App

Repeat steps 2-6 above, but:
- **Project Name:** `rms-admin-app`
- **Root Directory:** `frontend/admin-app` ⚠️ **CRITICAL: Set this!**
- **Environment Variables:** Same as Customer App

## ⚠️ Common Mistakes

### ❌ Wrong: Not Setting Root Directory
If you don't set the Root Directory, Vercel will try to build from the repository root and won't find the Next.js app.

### ✅ Correct: Setting Root Directory
Set the Root Directory to the specific app folder (e.g., `frontend/customer-app`)

### ❌ Wrong: Using Same Project for All Apps
Vercel can't deploy multiple Next.js apps from one project.

### ✅ Correct: Separate Projects
Create a separate Vercel project for each app.

## After Deployment

1. **Update Backend CORS:**
   - Go to Backend API project → Settings → Environment Variables
   - Update `FRONTEND_CUSTOMER_URL`, `FRONTEND_POS_URL`, etc. with your actual Vercel URLs

2. **Update Frontend API URLs:**
   - Go to each frontend project → Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_URL` with your backend API URL

3. **Redeploy:**
   - After updating environment variables, redeploy each project

## Need Help?

See `VERCEL_DEPLOYMENT.md` for detailed documentation.

