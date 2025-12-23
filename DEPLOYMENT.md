# Deployment Guide - De Fusion Flame Kitchen RMS

This guide covers deploying the complete Restaurant Management System to production.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ database
- Paystack account with API keys
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)

## 🗄️ Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE de_fusion_flame;

# Create user (optional)
CREATE USER rms_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE de_fusion_flame TO rms_user;
```

### 2. Run Migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed Initial Data (Optional)

```bash
cd backend
npm run seed
```

## 🔧 Backend Deployment

### 1. Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/de_fusion_flame?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRE=7d

# Paystack
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_from_paystack

# CORS - Update with your production URLs
FRONTEND_CUSTOMER_URL=https://your-domain.com
FRONTEND_POS_URL=https://pos.your-domain.com
FRONTEND_KDS_URL=https://kds.your-domain.com
FRONTEND_ADMIN_URL=https://admin.your-domain.com

# Restaurant Info
RESTAURANT_NAME=De Fusion Flame Kitchen
RESTAURANT_ADDRESS=Kasoa New Market Road Opposite Saviour Diagnostic Clinic
RESTAURANT_PHONE=0551796725,0545010103
```

### 2. Install Dependencies

```bash
cd backend
npm install --production
```

### 3. Start Backend Server

**Using PM2 (Recommended):**

```bash
npm install -g pm2
pm2 start server.js --name rms-backend
pm2 save
pm2 startup
```

**Using systemd (Linux):**

Create `/etc/systemd/system/rms-backend.service`:

```ini
[Unit]
Description=De Fusion Flame RMS Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable rms-backend
sudo systemctl start rms-backend
```

## 🌐 Frontend Deployment

### 1. Environment Variables

For each frontend app, create `.env.local`:

**Customer App (`frontend/customer-app/.env.local`):**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
```

**POS App (`frontend/pos-app/.env.local`):**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
```

**KDS App (`frontend/kds-app/.env.local`):**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
```

**Admin App (`frontend/admin-app/.env.local`):**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WS_URL=https://api.your-domain.com
```

### 2. Build Frontend Apps

```bash
# Customer App
cd frontend/customer-app
npm install
npm run build

# POS App
cd ../pos-app
npm install
npm run build

# KDS App
cd ../kds-app
npm install
npm run build

# Admin App
cd ../admin-app
npm install
npm run build
```

### 3. Deploy with PM2

```bash
# Customer App
cd frontend/customer-app
pm2 start npm --name "customer-app" -- start

# POS App
cd ../pos-app
pm2 start npm --name "pos-app" -- start

# KDS App
cd ../kds-app
pm2 start npm --name "kds-app" -- start

# Admin App
cd ../admin-app
pm2 start npm --name "admin-app" -- start
```

### 4. Deploy with Vercel (Recommended for Next.js)

1. Install Vercel CLI: `npm i -g vercel`
2. For each app:
   ```bash
   cd frontend/customer-app
   vercel
   ```
3. Follow the prompts and set environment variables in Vercel dashboard

## 🔒 Nginx Configuration

Create `/etc/nginx/sites-available/rms`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Customer App
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# POS App
server {
    listen 80;
    server_name pos.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# KDS App
server {
    listen 80;
    server_name kds.your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin App
server {
    listen 80;
    server_name admin.your-domain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com -d pos.your-domain.com -d kds.your-domain.com -d admin.your-domain.com
```

## 💳 Paystack Webhook Configuration

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to Settings > API Keys & Webhooks
3. Add webhook URL: `https://api.your-domain.com/api/webhooks/paystack`
4. Copy the webhook secret and add to `backend/.env`

## ✅ Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Backend server running
- [ ] Frontend apps built and running
- [ ] Nginx configured and SSL enabled
- [ ] Paystack webhook configured
- [ ] Test customer registration/login
- [ ] Test order creation
- [ ] Test Paystack payment flow
- [ ] Test POS order creation
- [ ] Test kitchen display system
- [ ] Test admin dashboard
- [ ] Create initial admin user
- [ ] Add menu items and categories

## 🚀 Creating Initial Admin User

You can create an admin user via API or database:

**Via API (after deployment):**
```bash
curl -X POST https://api.your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@defusionflame.com",
    "password": "secure_password",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Then update role in database:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@defusionflame.com';
```

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Database Backups
Set up automated PostgreSQL backups:
```bash
# Add to crontab
0 2 * * * pg_dump -U postgres de_fusion_flame > /backups/rms_$(date +\%Y\%m\%d).sql
```

## 🔄 Updates

To update the system:

1. Pull latest code
2. Run database migrations: `cd backend && npx prisma migrate deploy`
3. Rebuild frontend apps: `npm run build`
4. Restart services: `pm2 restart all`

## 🆘 Troubleshooting

### Backend not starting
- Check database connection
- Verify environment variables
- Check logs: `pm2 logs rms-backend`

### Frontend build errors
- Clear `.next` folders
- Reinstall dependencies: `rm -rf node_modules && npm install`

### WebSocket connection issues
- Verify CORS settings in backend
- Check firewall rules
- Ensure WebSocket proxy settings in Nginx

### Payment issues
- Verify Paystack keys are correct (live keys for production)
- Check webhook URL is accessible
- Review Paystack dashboard for transaction logs

## 📞 Support

For issues or questions, contact:
- Email: support@defusionflame.com
- Phone: 0551796725 / 0545010103

