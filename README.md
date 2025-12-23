# De Fusion Flame Kitchen - Restaurant Management System

A complete, production-ready Restaurant Management System with online ordering, POS, Kitchen Display System, and Admin Dashboard.

## 🏢 Restaurant Information

**Name:** De Fusion Flame Kitchen  
**Location:** Kasoa New Market Road Opposite Saviour Diagnostic Clinic  
**Contact:** 0551796725 / 0545010103

## 🎯 System Overview

This RMS consists of four main applications:

1. **Customer Web App** - Online ordering with Paystack payment
2. **POS System** - In-restaurant order management for receptionists/cashiers
3. **Kitchen Display System (KDS)** - Real-time order tracking for kitchen staff
4. **Admin Dashboard** - Menu management, analytics, and system administration

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- PostgreSQL with Prisma ORM
- JWT Authentication
- WebSocket (Socket.io) for real-time updates
- Paystack SDK for payments

### Frontend
- Next.js 14 (App Router)
- React 18
- Tailwind CSS (Dark Theme)
- Zustand for state management
- Socket.io Client for real-time updates

## 📁 Project Structure

```
.
├── backend/              # Express API server
├── frontend/
│   ├── customer-app/     # Customer ordering interface
│   ├── pos-app/          # POS system for cashiers
│   ├── kds-app/          # Kitchen display system
│   └── admin-app/        # Admin dashboard
└── README.md
```

## 🎭 System Versions

This system comes in two versions:

### 🎭 Demo Version
**Perfect for testing, demonstrations, and development**
- Quick setup with sample data
- SQLite database (no external DB needed)
- Test payment keys
- Pre-populated with demo users and orders

**Quick Start:**
```powershell
.\setup-demo.ps1
.\start-all.ps1
```

📚 **See `DEMO_SETUP.md` for detailed demo setup guide**

### 🚀 Production Version
**For live restaurant operations**
- PostgreSQL database
- Live Paystack integration
- Production-grade security
- Optimized for performance

**Quick Start:**
```powershell
.\setup-production.ps1
```

📚 **See `PRODUCTION_SETUP.md` for detailed production setup guide**

📖 **See `VERSIONS.md` for version comparison and choosing the right version**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (for production) or SQLite (for demo)
- npm or yarn

### Installation

#### Option 1: Demo Version (Recommended for First Time)

1. **Run demo setup script:**
```powershell
.\setup-demo.ps1
```

2. **Start all applications:**
```powershell
.\start-all.ps1
```

#### Option 2: Manual Installation

1. **Install all dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables:**

Copy `.env.example` files in each directory and fill in your values:
- Backend: Database URL, JWT secret, Paystack keys
- Frontend apps: API URL, WebSocket URL

3. **Set up database:**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

4. **Start development servers:**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Customer App:
```bash
npm run dev:customer
```

Terminal 3 - POS App:
```bash
npm run dev:pos
```

Terminal 4 - KDS App:
```bash
npm run dev:kds
```

Terminal 5 - Admin App:
```bash
npm run dev:admin
```

## 🔐 Default Admin Credentials

### Demo Version
After running `setup-demo.ps1`, use these credentials:
- **Admin:** admin@defusionflame.com / admin123
- **Receptionist:** receptionist@defusionflame.com / admin123
- **Cashier:** cashier@defusionflame.com / admin123
- **Kitchen:** kitchen@defusionflame.com / admin123
- **Customer:** customer1@defusionflame.com / admin123

### Production Version
After running `setup-production.ps1`, create admin user:
```bash
cd backend
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=strong_password node prisma/seed-production.js
```

## 💳 Paystack Configuration

1. Get your Paystack API keys from [Paystack Dashboard](https://dashboard.paystack.com)
2. Add public and secret keys to backend `.env`
3. Configure webhook URL: `https://your-domain.com/api/webhooks/paystack`

## 📱 Application URLs (Development)

- Customer App: http://localhost:3000
- POS App: http://localhost:3001
- KDS App: http://localhost:3002
- Admin Dashboard: http://localhost:3003
- Backend API: http://localhost:5000

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Encrypted passwords (bcrypt)
- Secure Paystack webhook verification
- CORS protection
- Rate limiting

## 📊 Features

### Customer App
- Browse menu with categories
- Add items to cart
- Checkout with Paystack
- Order tracking
- Order history

### POS System
- Walk-in order creation
- Table/takeaway selection
- Multiple payment methods (Cash, Card, POS Transfer)
- Receipt printing
- Discount application
- Real-time kitchen sync

### Kitchen Display System
- Real-time order queue
- Order status updates
- Order preparation timer
- Auto-refresh

### Admin Dashboard
- Menu management (CRUD)
- Category management
- Price variants
- Inventory tracking
- Sales reports & analytics
- Staff management
- Payment transaction logs

## 🚢 Deployment

- **Demo Setup:** See `DEMO_SETUP.md` for demo version setup
- **Production Setup:** See `PRODUCTION_SETUP.md` for production deployment
- **General Deployment:** See `DEPLOYMENT.md` for detailed deployment instructions
- **Version Comparison:** See `VERSIONS.md` for choosing the right version

## 📝 License

Proprietary - De Fusion Flame Kitchen

