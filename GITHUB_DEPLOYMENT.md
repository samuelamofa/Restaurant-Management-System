# Production Codebase - GitHub Repository

This repository contains the **production-ready** source code for the De Fusion Flame Restaurant Management System.

## 📦 What's Included in This Repository

### ✅ Production Code Included:
- **Source Code**: All backend and frontend application code
- **Database Schema**: Prisma schema and migrations
- **Production Scripts**: `setup-production.ps1`, `start-all.ps1`
- **Documentation**: `README.md`, `PRODUCTION_SETUP.md`, `DEPLOYMENT.md`
- **Configuration Files**: Package.json files, Next.js configs, Tailwind configs
- **License**: LICENSE file

### ❌ Excluded from Repository (via .gitignore):
- `node_modules/` - Install via `npm install` after cloning
- `.env` files - Create manually (see PRODUCTION_SETUP.md)
- Database files (`*.db`, `*.sqlite`) - Use PostgreSQL in production
- Build artifacts (`.next/`, `build/`, `dist/`)
- Uploaded files (`backend/uploads/*`)
- Demo-specific files (removed for production)

## 🚀 Getting Started After Cloning

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd "DE FUSION FLAME SYSTEM"
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Run production setup:**
   ```powershell
   .\setup-production.ps1
   ```

4. **Configure environment:**
   - Create `backend/.env` with your PostgreSQL connection string
   - Add Paystack LIVE API keys
   - Set production URLs (see PRODUCTION_SETUP.md for details)

5. **Start the system:**
   ```powershell
   .\start-all.ps1
   ```

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] PostgreSQL database created and accessible
- [ ] Paystack LIVE keys obtained
- [ ] Domain names configured
- [ ] SSL certificates ready
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Admin user created

## 📚 Documentation

- **README.md** - Main documentation and overview
- **PRODUCTION_SETUP.md** - Detailed production setup guide
- **DEPLOYMENT.md** - Deployment instructions and configuration

## 🔐 Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use strong passwords** - Especially for database and JWT secrets
- **Enable SSL/HTTPS** - Required for production
- **Restrict CORS** - Only allow production domains
- **Use LIVE Paystack keys** - Not test keys

## 🏗️ Project Structure

```
.
├── backend/              # Express API server
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── prisma/           # Database schema & migrations
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
├── frontend/
│   ├── customer-app/     # Customer ordering interface
│   ├── pos-app/          # POS system
│   ├── kds-app/          # Kitchen display system
│   └── admin-app/        # Admin dashboard
├── setup-production.ps1  # Production setup script
├── start-all.ps1         # Start all servers script
└── README.md             # Main documentation
```

## 📞 Support

For setup and deployment questions, refer to:
- `PRODUCTION_SETUP.md` for setup instructions
- `DEPLOYMENT.md` for deployment configuration

---

**Ready for Production Deployment!** 🚀

