# De Fusion Flame Kitchen - Restaurant Management System

A complete Restaurant Management System with online ordering, POS, Kitchen Display System, and Admin Dashboard.

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


## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Database (SQLite for development, PostgreSQL for production)
- Paystack account with API keys (test keys for development)
- npm or yarn

### Installation

1. **Install all dependencies:**
```bash
npm run install:all
```

Or install individually:
```bash
npm install
cd backend && npm install && cd ..
cd frontend/customer-app && npm install && cd ../..
cd frontend/pos-app && npm install && cd ../..
cd frontend/kds-app && npm install && cd ../..
cd frontend/admin-app && npm install && cd ../..
```

2. **Set up environment variables:**

Create `.env` files in each directory. Copy from `.env.example` files:
- `backend/.env` - Copy from `backend/.env.example`
- `frontend/customer-app/.env.local` - Copy from `frontend/customer-app/.env.example`
- `frontend/pos-app/.env.local` - Copy from `frontend/pos-app/.env.example`
- `frontend/kds-app/.env.local` - Copy from `frontend/kds-app/.env.example`
- `frontend/admin-app/.env.local` - Copy from `frontend/admin-app/.env.example`

**Required Backend Environment Variables:**
- `DATABASE_URL` - Database connection string (SQLite for dev: `file:./prisma/dev.db`)
- `JWT_SECRET` - Secret key for JWT tokens (generate with: `openssl rand -base64 32`)
- `PORT` - Server port (default: 5000)

**Optional Backend Variables:**
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `PAYSTACK_WEBHOOK_SECRET` - Paystack webhook secret
- `FRONTEND_*_URL` - CORS origins for frontend apps

**Frontend Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:5000/api`)

3. **Set up database:**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

4. **Start development servers:**

**Option 1: Use PowerShell scripts (Windows)**
```powershell
# Start all servers at once
.\start-all.ps1

# Or start individually
.\start-backend.ps1
.\start-customer-app.ps1
.\start-pos-app.ps1
.\start-kds-app.ps1
.\start-admin-app.ps1
```

**Option 2: Manual start (All platforms)**

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

## 🐛 Troubleshooting

### Backend won't start
- Ensure `backend/.env` exists with `JWT_SECRET` and `DATABASE_URL`
- Check if port 5000 is already in use
- Run `cd backend && npx prisma generate` to regenerate Prisma client
- Ensure database exists: `cd backend && npx prisma migrate dev`

### Frontend apps won't start
- Ensure `.env.local` files exist in each frontend app directory
- Check if ports 3000-3003 are already in use
- Clear Next.js cache: `rm -rf .next` (or `Remove-Item -Recurse -Force .next` on Windows)

### Database connection errors
- Verify `DATABASE_URL` in `backend/.env` is correct
- For SQLite: Ensure path is `file:./prisma/dev.db`
- Run migrations: `cd backend && npx prisma migrate dev`

## 🔐 Creating Admin User

Create your admin user:
```bash
cd backend
npm run seed:dev
```

This creates test users with the default password: `password123`

## 💳 Paystack Configuration

1. Get your Paystack API keys from [Paystack Dashboard](https://dashboard.paystack.com)
2. Add public and secret keys to backend `.env`
3. For webhooks, use a service like ngrok in development: `ngrok http 5000`

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

## 📝 License

Proprietary - De Fusion Flame Kitchen

