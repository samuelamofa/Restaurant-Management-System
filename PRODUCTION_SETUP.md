# Production Setup Guide - De Fusion Flame RMS

This guide will help you set up the **PRODUCTION version** of the De Fusion Flame Restaurant Management System for live deployment.

## 🚀 Production Requirements

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ database server
- ✅ Paystack account with LIVE API keys
- ✅ Domain name with SSL certificate
- ✅ Server with sufficient resources
- ✅ Backup strategy in place

## 📋 Pre-Deployment Checklist

- [ ] PostgreSQL database created and accessible
- [ ] Paystack LIVE keys obtained
- [ ] Domain names configured
- [ ] SSL certificates ready
- [ ] Server environment prepared
- [ ] Backup system configured
- [ ] Monitoring tools set up

## 🔧 Setup Process

### Option 1: Automated Setup (Recommended)

1. **Run the production setup script:**
   ```powershell
   .\setup-production.ps1
   ```

   This script will:
   - Install production dependencies
   - Configure production environment
   - Set up PostgreSQL database
   - Run production migrations
   - Build frontend applications
   - Generate secure JWT secret

### Option 2: Manual Setup

#### Step 1: Install Dependencies

```bash
cd backend
npm install --production
```

#### Step 2: Configure Environment

1. **Copy production environment template:**
   ```bash
   cp .env.example.production .env
   ```

2. **Edit `.env` file with your production values:**
   ```env
   # Database - PostgreSQL
   DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
   
   # JWT Secret (generate strong random secret)
   JWT_SECRET="your-strong-random-secret-min-32-characters"
   
   # Paystack LIVE Keys
   PAYSTACK_SECRET_KEY="sk_live_your_live_secret_key"
   PAYSTACK_PUBLIC_KEY="pk_live_your_live_public_key"
   PAYSTACK_WEBHOOK_SECRET="your_webhook_secret"
   
   # Production URLs
   FRONTEND_CUSTOMER_URL="https://your-domain.com"
   FRONTEND_POS_URL="https://pos.your-domain.com"
   FRONTEND_KDS_URL="https://kds.your-domain.com"
   FRONTEND_ADMIN_URL="https://admin.your-domain.com"
   ```

#### Step 3: Generate JWT Secret

```bash
# Generate a strong random secret
openssl rand -base64 32
```

Copy the output and set it as `JWT_SECRET` in your `.env` file.

#### Step 4: Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run production migrations
npx prisma migrate deploy
```

#### Step 5: Build Frontend Applications

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

## 🔐 Security Configuration

### 1. Environment Variables

**Never commit `.env` files!** Ensure:
- `.env` is in `.gitignore`
- Use strong, unique secrets
- Rotate secrets regularly
- Use different secrets for each environment

### 2. Database Security

- Use strong database passwords
- Restrict database access to application server only
- Enable SSL for database connections
- Regular backups

### 3. JWT Configuration

- Use strong random secrets (min 32 characters)
- Set appropriate expiration times
- Rotate secrets periodically

### 4. Paystack Configuration

- Use **LIVE keys** only (not test keys)
- Configure webhook URL: `https://your-domain.com/api/webhooks/paystack`
- Verify webhook secret
- Test payment flow before going live

### 5. CORS Configuration

Restrict CORS to production domains only:
```env
FRONTEND_CUSTOMER_URL=https://your-domain.com
FRONTEND_POS_URL=https://pos.your-domain.com
FRONTEND_KDS_URL=https://kds.your-domain.com
FRONTEND_ADMIN_URL=https://admin.your-domain.com
```

## 🗄️ Database Setup

### PostgreSQL Database

1. **Create database:**
   ```sql
   CREATE DATABASE de_fusion_flame;
   ```

2. **Create user (optional):**
   ```sql
   CREATE USER rms_user WITH PASSWORD 'strong_password';
   GRANT ALL PRIVILEGES ON DATABASE de_fusion_flame TO rms_user;
   ```

3. **Update DATABASE_URL in .env:**
   ```env
   DATABASE_URL="postgresql://rms_user:strong_password@localhost:5432/de_fusion_flame?schema=public"
   ```

### Run Migrations

```bash
cd backend
npx prisma migrate deploy
```

## 🚀 Deployment Options

### Option 1: PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start backend:**
   ```bash
   cd backend
   pm2 start server.js --name rms-backend
   pm2 save
   pm2 startup
   ```

3. **Start frontend apps:**
   ```bash
   cd frontend/customer-app
   pm2 start npm --name "customer-app" -- start
   
   cd ../pos-app
   pm2 start npm --name "pos-app" -- start
   
   cd ../kds-app
   pm2 start npm --name "kds-app" -- start
   
   cd ../admin-app
   pm2 start npm --name "admin-app" -- start
   ```

### Option 2: Systemd (Linux)

Create service files for each application. See `DEPLOYMENT.md` for details.

### Option 3: Docker

Create Dockerfiles and docker-compose.yml for containerized deployment.

## 🌐 Reverse Proxy (Nginx)

Configure Nginx as reverse proxy:

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
```

## 🔒 SSL Configuration

Use Let's Encrypt or your SSL provider:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com
```

## 👤 Create Admin User

After deployment, create admin user:

```bash
# Via API
curl -X POST https://api.your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "strong_password",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

Or use seed script (modify to create production admin).

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor
pm2 monit

# Status
pm2 status
```

### Application Logs

Configure logging to external service:
- Winston for structured logging
- Sentry for error tracking
- CloudWatch / Loggly for log aggregation

## 🔄 Backup Strategy

### Database Backups

```bash
# Automated backup script
pg_dump -U user -d de_fusion_flame > backup_$(date +%Y%m%d).sql
```

Schedule regular backups:
- Daily backups
- Weekly full backups
- Monthly archives

### File Backups

Backup uploaded files:
```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## 🔍 Health Checks

### Application Health

```bash
curl https://api.your-domain.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Database Health

Monitor database connections and performance.

## 🚨 Production Checklist

Before going live, verify:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] CORS configured correctly
- [ ] Paystack LIVE keys configured
- [ ] Webhook URL configured
- [ ] Admin user created
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] All applications tested
- [ ] Staff trained

## 🔧 Maintenance

### Regular Updates

1. **Update dependencies:**
   ```bash
   npm audit
   npm update
   ```

2. **Database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Restart applications:**
   ```bash
   pm2 restart all
   ```

### Performance Optimization

- Enable caching
- Optimize database queries
- Use CDN for static assets
- Implement rate limiting
- Monitor performance metrics

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs`
- Review error tracking
- Check database connectivity
- Verify environment variables

## 🔄 Rollback Plan

If issues occur:

1. **Stop applications:**
   ```bash
   pm2 stop all
   ```

2. **Restore database backup:**
   ```bash
   psql -U user -d de_fusion_flame < backup.sql
   ```

3. **Revert code changes:**
   ```bash
   git checkout previous-version
   ```

4. **Restart applications:**
   ```bash
   pm2 restart all
   ```

---

**Remember:** Production deployment requires careful planning and testing. Always test in a staging environment first!

