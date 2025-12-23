# System Versions - De Fusion Flame RMS

This document explains the different versions of the De Fusion Flame Restaurant Management System and how to use them.

## 📦 Available Versions

### 🎭 Demo Version
**Purpose:** Testing, demonstrations, and development

**Features:**
- Pre-populated with comprehensive sample data
- SQLite database (easy setup)
- Test Paystack keys
- Multiple demo users
- Sample orders and menu items
- Quick setup process

**Use Cases:**
- Testing new features
- Demonstrating to clients
- Training staff
- Development and debugging

**Setup:** See `DEMO_SETUP.md`

---

### 🚀 Production Version
**Purpose:** Live deployment for actual restaurant operations

**Features:**
- PostgreSQL database (production-ready)
- Live Paystack integration
- Secure configuration
- Production-grade security
- Optimized performance
- Full backup support

**Use Cases:**
- Live restaurant operations
- Real customer orders
- Actual payment processing
- Production deployment

**Setup:** See `PRODUCTION_SETUP.md`

---

## 🔄 Version Comparison

| Feature | Demo Version | Production Version |
|---------|-------------|-------------------|
| **Database** | SQLite | PostgreSQL |
| **Paystack** | Test Keys | Live Keys |
| **Sample Data** | Pre-populated | Empty (create your own) |
| **Security** | Relaxed | Strict |
| **CORS** | Open (localhost) | Restricted (production domains) |
| **Setup Time** | ~5 minutes | ~30 minutes |
| **Use Case** | Testing/Demo | Live Operations |

---

## 🎯 Choosing the Right Version

### Use Demo Version If:
- ✅ You want to test the system
- ✅ You're demonstrating to stakeholders
- ✅ You're developing new features
- ✅ You're training staff
- ✅ You want quick setup

### Use Production Version If:
- ✅ You're deploying to live restaurant
- ✅ You need real payment processing
- ✅ You need production-grade security
- ✅ You need database scalability
- ✅ You're going live with customers

---

## 📋 Quick Start Guide

### Demo Version Setup

1. **Run setup script:**
   ```powershell
   .\setup-demo.ps1
   ```

2. **Start applications:**
   ```powershell
   .\start-all.ps1
   ```

3. **Access applications:**
   - Customer App: http://localhost:3000
   - POS App: http://localhost:3001
   - KDS App: http://localhost:3002
   - Admin App: http://localhost:3003

4. **Login with demo credentials:**
   - Admin: admin@defusionflame.com / admin123

### Production Version Setup

1. **Prepare prerequisites:**
   - PostgreSQL database
   - Paystack LIVE keys
   - Domain names
   - SSL certificates

2. **Run setup script:**
   ```powershell
   .\setup-production.ps1
   ```

3. **Configure environment:**
   - Update `backend/.env` with production values
   - Set database connection
   - Configure Paystack keys
   - Set production URLs

4. **Deploy applications:**
   - Use PM2 or systemd
   - Configure reverse proxy (Nginx)
   - Set up SSL

5. **Create admin user:**
   ```bash
   cd backend
   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=strong_password node prisma/seed-production.js
   ```

---

## 🔐 Security Considerations

### Demo Version
- ⚠️ Uses default passwords (change for testing)
- ⚠️ Open CORS (localhost only)
- ⚠️ Test payment keys (no real payments)
- ⚠️ SQLite database (not for production)

### Production Version
- ✅ Strong passwords required
- ✅ Restricted CORS (production domains only)
- ✅ Live payment keys (real transactions)
- ✅ PostgreSQL database (scalable)
- ✅ SSL/HTTPS required
- ✅ Rate limiting enabled
- ✅ Security headers configured

---

## 📊 Data Management

### Demo Version
- **Seed Script:** `backend/prisma/seed-demo.js`
- **Data:** Comprehensive sample data
- **Reset:** Run seed script again to reset

### Production Version
- **Seed Script:** `backend/prisma/seed-production.js`
- **Data:** Admin user only (create rest via UI)
- **Backup:** Regular database backups required

---

## 🔄 Migrating Between Versions

### From Demo to Production

1. **Backup demo data** (if needed)
2. **Set up PostgreSQL database**
3. **Run production setup script**
4. **Configure production environment**
5. **Migrate data** (if needed)
6. **Test thoroughly**
7. **Deploy**

### From Production to Demo

1. **Backup production data**
2. **Switch to SQLite**
3. **Run demo setup script**
4. **Seed demo data**

---

## 🛠️ Maintenance

### Demo Version
- **Updates:** Regular updates for testing
- **Data Reset:** Run seed script
- **Backups:** Not critical (test data)

### Production Version
- **Updates:** Careful, tested updates
- **Data Backup:** Daily backups required
- **Monitoring:** Continuous monitoring
- **Security:** Regular security audits

---

## 📚 Documentation

- **Demo Setup:** `DEMO_SETUP.md`
- **Production Setup:** `PRODUCTION_SETUP.md`
- **Deployment:** `DEPLOYMENT.md`
- **Main README:** `README.md`

---

## ❓ Frequently Asked Questions

### Can I use demo version in production?
**No!** Demo version is for testing only. It uses test data, test payment keys, and is not secure for production use.

### Can I convert demo data to production?
You can export demo data and import it, but it's recommended to start fresh in production with real data.

### Do I need different code for each version?
No, the same codebase works for both. The difference is in configuration and data.

### Can I run both versions simultaneously?
Yes, but use different ports and databases to avoid conflicts.

### Which version should I use for development?
Use the **Demo Version** for development. It's faster to set up and has sample data for testing.

---

## 🆘 Support

For issues or questions:
- Check the relevant setup guide (DEMO_SETUP.md or PRODUCTION_SETUP.md)
- Review the main README.md
- Check DEPLOYMENT.md for deployment-specific issues

---

**Remember:** Always test in demo mode before deploying to production!

