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

### 3. Environment Variables

Set the following environment variables in Railway dashboard:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=...
FRONTEND_CUSTOMER_URL=https://...
FRONTEND_POS_URL=https://...
FRONTEND_KDS_URL=https://...
FRONTEND_ADMIN_URL=https://...
RESTAURANT_NAME=...
RESTAURANT_ADDRESS=...
RESTAURANT_PHONE=...
```

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

If you see "npm ci can only install with an existing package-lock.json":
- Ensure `backend/package-lock.json` is committed to git
- Verify the root directory is set to `backend` in Railway dashboard
- Check that `.gitignore` doesn't exclude `backend/package-lock.json`

