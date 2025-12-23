# Frontend Setup for Railway Backend

This guide explains how to configure your frontend applications to connect to your Railway-deployed backend.

## 🎯 Quick Setup

Your frontend apps need to know where your Railway backend is located. You need to set the `NEXT_PUBLIC_API_URL` environment variable.

### Step 1: Get Your Railway Backend URL

1. Go to your Railway project dashboard
2. Select your backend service
3. Click on the **Settings** tab
4. Under **Networking**, you'll see your **Public Domain** (e.g., `your-app-name.railway.app`)
5. Copy this URL - this is your backend URL

**Example:** If your Railway domain is `rms-backend-production.up.railway.app`, your API URL would be:
```
https://rms-backend-production.up.railway.app/api
```

### Step 2: Configure Frontend Environment Variables

For each frontend app you're deploying, you need to set environment variables:

#### For Vercel Deployment (Recommended for Next.js):

1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables for **Production**, **Preview**, and **Development**:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
```

**For Customer App only, also add:**
```bash
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
```

4. **Redeploy** your frontend apps after adding variables

#### For Local Development:

Create `.env.local` file in each frontend app directory:

**`frontend/customer-app/.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
```

**`frontend/pos-app/.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
```

**`frontend/kds-app/.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
```

**`frontend/admin-app/.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api
NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
```

### Step 3: Verify Connection

1. Restart your frontend development server (if running locally)
2. Try logging in - it should now connect to your Railway backend

## 🔍 Troubleshooting

### "Cannot connect to backend server"

**If you see this error:**
- Check that `NEXT_PUBLIC_API_URL` is set correctly
- Ensure the URL includes `/api` at the end (e.g., `https://your-app.railway.app/api`)
- Verify your Railway backend is running (check Railway dashboard)
- Make sure CORS is configured on your Railway backend (check `FRONTEND_*_URL` variables in Railway)

### CORS Errors

If you see CORS errors in the browser console:
1. Go to Railway dashboard → Your backend service → Variables
2. Ensure these are set:
   ```
   FRONTEND_CUSTOMER_URL=https://your-customer-app-domain.com
   FRONTEND_POS_URL=https://your-pos-app-domain.com
   FRONTEND_KDS_URL=https://your-kds-app-domain.com
   FRONTEND_ADMIN_URL=https://your-admin-app-domain.com
   ```
3. Redeploy your Railway backend after adding these variables

### Environment Variables Not Working

**For Next.js:**
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- After adding/changing variables, you **must rebuild** your Next.js app
- For Vercel: Redeploy after adding variables
- For local: Restart the dev server (`npm run dev`)

## 📝 Example Configuration

If your Railway backend URL is: `https://rms-backend-production.up.railway.app`

Then your environment variables should be:

```env
NEXT_PUBLIC_API_URL=https://rms-backend-production.up.railway.app/api
NEXT_PUBLIC_WS_URL=https://rms-backend-production.up.railway.app
```

**Important:** 
- Always use `https://` (not `http://`)
- API URL must end with `/api`
- WebSocket URL should NOT have `/api` at the end

## 🚀 Deployment Checklist

- [ ] Railway backend is deployed and running
- [ ] Railway backend has all required environment variables set
- [ ] Frontend apps have `NEXT_PUBLIC_API_URL` set to Railway backend URL
- [ ] Frontend apps have `NEXT_PUBLIC_WS_URL` set to Railway backend URL
- [ ] CORS URLs are configured in Railway backend
- [ ] Frontend apps are rebuilt/redeployed after setting variables
- [ ] Test login functionality to verify connection

