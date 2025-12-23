# Demo Setup Guide - De Fusion Flame RMS

This guide will help you set up the **DEMO version** of the De Fusion Flame Restaurant Management System with sample data for testing and demonstration purposes.

## 🎭 What is Demo Mode?

Demo mode is designed for:
- **Testing** the system before production deployment
- **Demonstrations** to stakeholders and clients
- **Development** and feature testing
- **Training** staff on system usage

**⚠️ Important:** Demo mode uses test data and should **NEVER** be used in production!

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Windows PowerShell (for setup script)

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

1. **Run the demo setup script:**
   ```powershell
   .\setup-demo.ps1
   ```

   This script will:
   - Install all dependencies
   - Configure demo environment
   - Set up SQLite database
   - Seed comprehensive sample data
   - Prepare all frontend applications

### Option 2: Manual Setup

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure demo environment:**
   ```bash
   cp .env.example.demo .env
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name demo_init
   ```

5. **Seed demo data:**
   ```bash
   node prisma/seed-demo.js
   ```

6. **Install frontend dependencies:**
   ```bash
   cd ../frontend/customer-app && npm install
   cd ../pos-app && npm install
   cd ../kds-app && npm install
   cd ../admin-app && npm install
   ```

## 🎮 Starting the Demo System

After setup, start all applications:

```powershell
.\start-all.ps1
```

Or start individually:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Customer App:**
```bash
cd frontend/customer-app
npm run dev
```

**Terminal 3 - POS App:**
```bash
cd frontend/pos-app
npm run dev
```

**Terminal 4 - KDS App:**
```bash
cd frontend/kds-app
npm run dev
```

**Terminal 5 - Admin App:**
```bash
cd frontend/admin-app
npm run dev
```

## 📱 Application URLs

Once started, access the applications at:

- **Customer App:** http://localhost:3000
- **POS App:** http://localhost:3001
- **KDS App:** http://localhost:3002
- **Admin Dashboard:** http://localhost:3003
- **Backend API:** http://localhost:5000

## 🔐 Demo Credentials

The demo setup includes pre-configured users:

### Admin Access
- **Email:** admin@defusionflame.com
- **Password:** admin123
- **Role:** ADMIN
- **Access:** Full system access

### Staff Access
- **Receptionist:** receptionist@defusionflame.com / admin123
- **Cashier:** cashier@defusionflame.com / admin123
- **Kitchen Staff:** kitchen@defusionflame.com / admin123

### Customer Access
- **Customer 1:** customer1@defusionflame.com / admin123
- **Customer 2:** customer2@defusionflame.com / admin123
- **Customer 3:** customer3@defusionflame.com / admin123
- **Customer 4:** customer4@defusionflame.com / admin123
- **Customer 5:** customer5@defusionflame.com / admin123

## 📊 Demo Data Included

The demo seed script creates:

### Users
- 1 Admin user
- 3 Staff users (Receptionist, Cashier, Kitchen)
- 5 Customer users

### Menu Items
- **6 Categories:** Starters, Main Courses, Drinks, Desserts, Sides, Specials
- **20+ Menu Items** with:
  - Price variants (Small, Medium, Large)
  - Add-ons (Extra chicken, sauce, etc.)
  - Descriptions and pricing

### Sample Orders
- **10 Sample Orders** with various:
  - Order types (Dine In, Takeaway, Online)
  - Order statuses (Pending, Confirmed, Preparing, Ready, Completed)
  - Payment methods (Cash, Card, Mobile Money, Paystack)
  - Payment statuses (Pending, Paid)

## 🧪 Testing Features

### Customer App Testing
1. Browse menu with categories
2. Add items to cart with variants and addons
3. Test checkout with different order types:
   - **Delivery:** Requires address and phone
   - **Dine In:** Requires table number
   - **Takeaway:** Optional phone
4. View order history
5. Track order status

### POS App Testing
1. Create walk-in orders
2. Select order type (Dine In/Takeaway)
3. Apply discounts
4. Process payments (Cash, Card, Mobile Money)
5. Print receipts

### KDS App Testing
1. View real-time order queue
2. Update order statuses
3. Track preparation time
4. View order details

### Admin App Testing
1. Manage menu items and categories
2. View sales reports
3. Manage staff users
4. Configure system settings
5. View payment transactions

## 🔄 Resetting Demo Data

To reset the demo database with fresh sample data:

```bash
cd backend
node prisma/seed-demo.js
```

**Note:** This will clear existing data and recreate demo data.

## ⚙️ Demo Configuration

Demo mode uses:
- **SQLite database** (easy setup, no external DB required)
- **Test Paystack keys** (no real payments)
- **Relaxed CORS** (allows localhost)
- **Sample data** (pre-populated)

## 🚨 Important Notes

1. **Never use demo credentials in production**
2. **Demo mode is for testing only**
3. **Payments in demo mode are simulated**
4. **Database is SQLite (not suitable for production)**
5. **CORS is open (not secure for production)**

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database
cd backend
rm prisma/dev.db
npx prisma migrate dev
node prisma/seed-demo.js
```

### Port Already in Use
```powershell
# Kill process on port 5000
.\kill-port-5000.ps1
```

### Dependencies Issues
```bash
# Clean install
cd backend
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

After testing in demo mode:
1. Review all features
2. Test workflows
3. Train staff
4. Plan production deployment
5. See `PRODUCTION_SETUP.md` for production setup

## 💡 Tips

- Use different browsers/incognito for different user roles
- Test all order types (Delivery, Dine In, Takeaway)
- Try different payment methods
- Test order status updates
- Explore admin features

---

**Need Help?** Check the main README.md or DEPLOYMENT.md for more information.

