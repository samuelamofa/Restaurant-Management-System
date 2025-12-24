# De Fusion Flame Kitchen RMS - Detailed Technology Stack

## 📋 Project Overview
**Project Name:** De Fusion Flame Kitchen - Restaurant Management System (RMS)  
**Architecture:** Monorepo with multiple frontend applications  
**Version:** 1.0.0  
**Package Manager:** npm (with workspaces)

---

## 🏗️ Architecture Pattern

### Monorepo Structure
- **Root Workspace:** npm workspaces
- **Backend:** Single Express.js API server
- **Frontend:** Four separate Next.js applications
- **Database:** PostgreSQL (Production) / SQLite (Development option)

---

## 🔧 Backend Stack

### **Runtime & Framework**
- **Node.js:** JavaScript runtime
- **Express.js:** `^4.18.2` - Web application framework
- **HTTP Server:** Native Node.js `http` module for Socket.io integration

### **Database & ORM**
- **PostgreSQL:** Primary production database
- **Prisma:** `^5.7.1` - Type-safe ORM and database toolkit
  - **Prisma Client:** `^5.7.1` - Database client
  - **Schema-driven:** TypeScript-like schema definition
  - **Migrations:** Automated database migration system

### **Authentication & Security**
- **JSON Web Token (JWT):** `^9.0.2` - Token-based authentication
- **bcryptjs:** `^2.4.3` - Password hashing
- **Helmet:** `^7.1.0` - Security headers middleware
- **express-rate-limit:** `^7.1.5` - Rate limiting middleware
- **CORS:** `^2.8.5` - Cross-origin resource sharing

### **Real-time Communication**
- **Socket.io:** `^4.6.1` - WebSocket library for real-time updates
  - Kitchen Display System (KDS) updates
  - POS order synchronization
  - Order status broadcasting

### **Payment Integration**
- **Paystack SDK:** Payment gateway integration
  - Live API keys support
  - Webhook verification
  - Transaction reference tracking

### **File Upload**
- **Multer:** `^2.0.2` - Multipart/form-data handling
  - Menu item image uploads
  - Category image uploads

### **Validation**
- **express-validator:** `^7.0.1` - Request validation middleware

### **HTTP Client**
- **Axios:** `^1.6.2` - HTTP client for external API calls

### **Development Tools**
- **Nodemon:** `^3.0.2` - Development server auto-reload
- **dotenv:** `^16.3.1` - Environment variable management

### **Logging & Monitoring**
- **Morgan:** `^1.10.0` - HTTP request logger middleware
- **Custom Audit Logging:** User action tracking

### **Backend API Routes**
- `/api/auth` - Authentication endpoints
- `/api/menu` - Menu management
- `/api/orders` - Order processing
- `/api/payments` - Payment handling
- `/api/admin` - Admin operations
- `/api/staff` - Staff management
- `/api/kitchen` - Kitchen operations
- `/api/webhooks` - Paystack webhooks
- `/api/settings` - System settings
- `/api/day-session` - Daily session management
- `/api/upload` - File upload endpoints

---

## 🎨 Frontend Stack

### **Core Framework**
- **Next.js:** `14.0.4` / `^14.2.35` - React framework
  - **App Router:** Next.js 14 App Router architecture
  - **Server Components:** React Server Components
  - **File-based Routing:** Automatic route generation

### **React Ecosystem**
- **React:** `^18.2.0` / `^18.3.1` - UI library
- **React DOM:** `^18.2.0` / `^18.3.1` - React rendering

### **State Management**
- **Zustand:** `^4.4.7` - Lightweight state management
  - Global application state
  - Authentication state
  - Cart management (Customer App)

### **Real-time Client**
- **Socket.io Client:** `^4.6.1` / `^4.8.2` - WebSocket client
  - Real-time order updates
  - Kitchen status synchronization

### **HTTP Client**
- **Axios:** `^1.6.2` - API communication
  - RESTful API calls
  - Request/Response interceptors

### **UI & Styling**
- **Tailwind CSS:** `^3.3.0` - Utility-first CSS framework
  - Dark theme implementation
  - Responsive design
  - Custom utility classes

### **UI Components & Icons**
- **Lucide React:** `^0.303.0` - Icon library
  - Consistent icon system
  - SVG-based icons

### **Notifications**
- **React Hot Toast:** `^2.4.1` - Toast notification library
  - Success/error messages
  - Action feedback

### **Data Visualization (Admin App Only)**
- **Recharts:** `^2.10.3` - Chart library
  - Sales analytics
  - Revenue reports
  - Order statistics

### **Development Tools**
- **TypeScript:** `^5` - Type safety (configurations in some apps)
- **ESLint:** `^8` - Code linting
- **ESLint Config Next:** `14.0.4` / `^14.2.35` - Next.js lint rules
- **PostCSS:** `^8` - CSS processing
- **Autoprefixer:** `^10.0.1` - CSS vendor prefixing

### **Type Definitions**
- **@types/node:** `^20` - Node.js type definitions
- **@types/react:** `^18` - React type definitions
- **@types/react-dom:** `^18` - React DOM type definitions

---

## 📱 Frontend Applications

### **1. Customer App** (`frontend/customer-app`)
- **Port:** 3000
- **Purpose:** Online ordering interface for customers
- **Features:**
  - Menu browsing
  - Shopping cart
  - Paystack checkout
  - Order tracking
  - Order history

### **2. POS App** (`frontend/pos-app`)
- **Port:** 3001
- **Purpose:** Point of Sale system for receptionists/cashiers
- **Features:**
  - Walk-in order creation
  - Table/takeaway management
  - Multiple payment methods
  - Receipt printing
  - Real-time kitchen sync

### **3. KDS App** (`frontend/kds-app`)
- **Port:** 3002
- **Purpose:** Kitchen Display System for kitchen staff
- **Features:**
  - Real-time order queue
  - Order status updates
  - Preparation timer
  - Auto-refresh

### **4. Admin App** (`frontend/admin-app`)
- **Port:** 3003
- **Purpose:** Administrative dashboard
- **Features:**
  - Menu management (CRUD)
  - Category management
  - Price variants
  - Inventory tracking
  - Sales reports & analytics
  - Staff management
  - Payment transaction logs

---

## 🗄️ Database Schema (Prisma)

### **Core Models**
1. **User** - Staff and customer accounts
   - Roles: CUSTOMER, RECEPTIONIST, CASHIER, KITCHEN_STAFF, ADMIN
   - JWT authentication

2. **Category** - Menu categories
   - Display ordering
   - Active/inactive status

3. **MenuItem** - Food items
   - Base pricing
   - Availability status

4. **PriceVariant** - Size/portion variants
   - Small, Medium, Large options

5. **Addon** - Additional items
   - Optional extras for menu items

6. **Order** - Customer orders
   - Order types: DINE_IN, TAKEAWAY, ONLINE
   - Status: PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
   - Payment tracking

7. **OrderItem** - Individual order line items
   - Quantity, pricing, notes

8. **OrderItemAddon** - Selected addons per item

9. **Payment** - Payment records
   - Methods: CASH, CARD, MOMO, PAYSTACK
   - Status: PENDING, PAID, FAILED, REFUNDED
   - Paystack transaction references

10. **Inventory** - Stock management
    - Quantity tracking
    - Unit measurements

11. **AuditLog** - System audit trail
    - User actions
    - IP tracking
    - Entity changes

12. **SystemSettings** - Configuration
    - Restaurant information
    - Tax rates
    - Paystack keys
    - Order settings

13. **DaySession** - Daily operations
    - Revenue tracking
    - Payment method breakdown
    - Session management

---

## 🔒 Security Features

- **JWT Authentication:** Token-based auth system
- **Role-Based Access Control (RBAC):** Multi-role permission system
- **Password Encryption:** bcrypt hashing
- **CORS Protection:** Configured origins
- **Rate Limiting:** API request throttling
- **Helmet.js:** Security headers
- **Paystack Webhook Verification:** Secure payment callbacks
- **Input Validation:** express-validator
- **SQL Injection Protection:** Prisma parameterized queries

---

## 🚀 Development Workflow

### **Scripts (Root)**
- `npm start` - Start backend server
- `npm run dev:backend` - Backend development server
- `npm run dev:customer` - Customer app dev server
- `npm run dev:pos` - POS app dev server
- `npm run dev:kds` - KDS app dev server
- `npm run dev:admin` - Admin app dev server
- `npm run install:all` - Install all dependencies

### **Backend Scripts**
- `npm run dev` - Development with nodemon
- `npm start` - Production server
- `npm run migrate` - Database migrations
- `npm run generate` - Generate Prisma client
- `npm run seed:production` - Seed production data

### **Frontend Scripts** (each app)
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Production server
- `npm run lint` - Lint code

---

## 🛠️ Infrastructure & DevOps

### **Automation Scripts**
- **PowerShell Scripts:**
  - `setup-production.ps1` - Production environment setup
  - `start-all.ps1` - Start all applications

### **Database Migrations**
- Prisma migration system
- Version-controlled schema changes
- Migration history tracking

### **Environment Configuration**
- `.env` files for environment variables
- Separate configs for development/production
- Database URL configuration
- API keys management

---

## 📦 Package Management

- **npm Workspaces:** Monorepo dependency management
- **Workspaces:**
  - `backend`
  - `frontend/*`

---

## 🔌 Third-Party Integrations

### **Payment Gateway**
- **Paystack**
  - Live API integration
  - Webhook support
  - Transaction verification
  - Reference tracking

---

## 📊 Performance Features

- **Rate Limiting:** Prevents API abuse
- **Image Optimization:** Static file serving with caching
- **Database Indexing:** Optimized queries (Prisma indexes)
- **Connection Pooling:** Prisma connection management
- **Graceful Shutdown:** Database disconnection handling

---

## 🌐 Deployment

### **Production Setup**
- PostgreSQL database
- Environment variable configuration
- Production builds (Next.js)
- Process management

### **Recommended Platforms**
- **Backend:** Railway, Heroku, AWS, DigitalOcean
- **Frontend:** Vercel, Netlify, AWS S3 + CloudFront
- **Database:** Railway PostgreSQL, AWS RDS, Supabase

---

## 📝 Code Quality

- **ESLint:** Code linting
- **TypeScript Support:** Type safety (where configured)
- **Error Handling:** Centralized error middleware
- **Logging:** Morgan HTTP logger + custom audit logs

---

## 🔄 Real-time Features

- **Socket.io Integration:**
  - Order status updates
  - Kitchen order queue
  - POS synchronization
  - Role-based room joining
  - Authenticated socket connections

---

## 📄 File Structure Summary

```
.
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── prisma/          # Database schema & migrations
│   ├── utils/           # Utility functions
│   ├── uploads/         # Uploaded files
│   └── server.js        # Main server file
├── frontend/
│   ├── customer-app/    # Customer ordering app
│   ├── pos-app/         # POS system
│   ├── kds-app/         # Kitchen display
│   └── admin-app/       # Admin dashboard
└── [Configuration Files]
```

---

## 🎯 Key Technologies Summary

| Category | Technology |
|----------|-----------|
| **Backend Framework** | Express.js 4.18 |
| **Frontend Framework** | Next.js 14 (App Router) |
| **Runtime** | Node.js 18+ |
| **Database** | PostgreSQL (Production) |
| **ORM** | Prisma 5.7 |
| **Authentication** | JWT |
| **Real-time** | Socket.io 4.6 |
| **State Management** | Zustand 4.4 |
| **Styling** | Tailwind CSS 3.3 |
| **HTTP Client** | Axios 1.6 |
| **Payment** | Paystack SDK |
| **File Upload** | Multer 2.0 |
| **Icons** | Lucide React |
| **Notifications** | React Hot Toast |
| **Charts** | Recharts (Admin) |

---

**Last Updated:** Based on current project structure and dependencies  
**Project:** De Fusion Flame Kitchen Restaurant Management System

