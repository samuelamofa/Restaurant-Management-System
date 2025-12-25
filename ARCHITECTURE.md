# De Fusion Flame Kitchen RMS - System Architecture

## 🏗️ Architecture Overview

This is a **monorepo-based microservices architecture** with a single backend API serving multiple frontend applications. The system follows a **client-server architecture** with real-time capabilities via WebSockets.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                      │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Customer App │   POS App    │   KDS App    │  Admin App    │
│  (Port 3000) │  (Port 3001) │  (Port 3002) │ (Port 3003)   │
└──────┬───────┴──────┬────────┴──────┬───────┴───────┬───────┘
       │             │               │               │
       └─────────────┴───────────────┴───────────────┘
                      │
              ┌───────▼────────┐
              │  Backend API    │
              │  (Port 5000)    │
              │  Express +      │
              │  Socket.io      │
              └───────┬─────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
   │PostgreSQL│  │  Paystack │  │Uploads │
   │ Database │  │   API     │  │Storage │
   └──────────┘  └───────────┘  └────────┘
```

## 📦 Project Structure

```
DE FUSION FLAME SYSTEM/
├── backend/                    # Express.js Backend API
│   ├── config/                # Configuration files
│   │   └── database.js         # Prisma client & DB connection
│   ├── middleware/             # Express middleware
│   │   ├── auth.js            # JWT authentication
│   │   ├── errorHandler.js    # Global error handling
│   │   ├── socketAuth.js      # Socket.io authentication
│   │   └── upload.js           # File upload handling
│   ├── routes/                 # API route handlers
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── menu.js            # Menu CRUD operations
│   │   ├── orders.js          # Order management
│   │   ├── payments.js        # Payment processing
│   │   ├── admin.js           # Admin operations
│   │   ├── kitchen.js         # Kitchen-specific endpoints
│   │   ├── staff.js           # Staff management
│   │   ├── settings.js        # Restaurant settings
│   │   ├── daySession.js      # Daily session management
│   │   ├── chat.js            # Customer support chat
│   │   ├── upload.js          # File upload endpoints
│   │   └── webhooks.js        # Paystack webhooks
│   ├── scripts/               # Utility scripts
│   │   ├── migrate-and-start.js    # Production startup script
│   │   ├── generate-prisma.js      # Prisma client generation
│   │   ├── migrate-runtime.js      # Runtime migrations
│   │   └── baseline-postgresql.js  # PostgreSQL baseline
│   ├── prisma/                # Database schema & migrations
│   │   ├── schema.prisma      # Prisma schema definition
│   │   └── migrations/        # Database migrations
│   ├── utils/                 # Utility functions
│   │   ├── asyncHandler.js    # Async error wrapper
│   │   ├── auditLog.js        # Audit logging
│   │   └── generateOrderNumber.js # Order number generator
│   ├── uploads/               # File upload storage
│   ├── server.js              # Express server entry point
│   └── package.json          # Backend dependencies
│
├── frontend/                   # Frontend Applications
│   ├── customer-app/          # Customer Web App (Next.js)
│   │   ├── app/               # Next.js App Router
│   │   │   ├── page.js       # Home/Menu page
│   │   │   ├── cart/         # Shopping cart
│   │   │   ├── menu/         # Menu browsing
│   │   │   ├── orders/       # Order history
│   │   │   └── components/   # React components
│   │   └── lib/              # Utilities & stores
│   │       ├── api.js        # API client
│   │       └── store.js      # Zustand state management
│   │
│   ├── pos-app/               # POS System (Next.js)
│   │   ├── app/
│   │   │   ├── page.js       # POS dashboard
│   │   │   ├── dashboard/    # Sales dashboard
│   │   │   └── components/   # POS components
│   │   └── lib/
│   │
│   ├── kds-app/              # Kitchen Display System (Next.js)
│   │   ├── app/
│   │   │   ├── page.js       # KDS main view
│   │   │   ├── reports/      # Kitchen reports
│   │   │   └── components/  # KDS components
│   │   └── lib/
│   │
│   └── admin-app/            # Admin Dashboard (Next.js)
│       ├── app/
│       │   ├── page.js       # Admin dashboard
│       │   ├── menu/         # Menu management
│       │   ├── orders/       # Order management
│       │   ├── users/        # User management
│       │   ├── settings/     # System settings
│       │   └── components/  # Admin components
│       └── lib/
│
└── package.json              # Root workspace configuration
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **ORM**: Prisma 5.7.1
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: Socket.io 4.6.1
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Payment**: Paystack SDK

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS (Dark Theme)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🔄 System Flow

### 1. Authentication Flow
```
User Login
    ↓
POST /api/auth/login
    ↓
Backend validates credentials
    ↓
Returns JWT token
    ↓
Frontend stores token (Zustand + localStorage)
    ↓
Token included in subsequent requests
```

### 2. Order Processing Flow
```
Customer/POS creates order
    ↓
POST /api/orders
    ↓
Backend creates order in database
    ↓
Socket.io emits 'order:new' event
    ↓
KDS receives real-time update
    ↓
Kitchen staff updates order status
    ↓
Socket.io emits 'order:updated' event
    ↓
All connected clients receive update
```

### 3. Payment Flow (Online Orders)
```
Customer completes checkout
    ↓
POST /api/payments/initialize
    ↓
Backend creates Paystack transaction
    ↓
Returns payment URL to customer
    ↓
Customer pays via Paystack
    ↓
Paystack sends webhook to /api/webhooks/paystack
    ↓
Backend verifies webhook signature
    ↓
Updates order payment status
    ↓
Socket.io emits payment confirmation
```

### 4. Real-time Communication
```
Frontend connects to Socket.io
    ↓
Authenticates with JWT token
    ↓
Subscribes to relevant rooms/events
    ↓
Receives real-time updates:
    - order:new
    - order:updated
    - order:status-changed
    - payment:confirmed
    - chat:message
```

## 🗄️ Database Schema

### Core Models
- **User**: Authentication & user management
  - Roles: CUSTOMER, RECEPTIONIST, CASHIER, KITCHEN_STAFF, ADMIN
- **Category**: Menu categories
- **MenuItem**: Menu items with base prices
- **PriceVariant**: Size variants (Small, Medium, Large)
- **Addon**: Additional items (extras)
- **Order**: Order records
  - Status: PENDING → CONFIRMED → PREPARING → READY → COMPLETED
  - Types: DINE_IN, TAKEAWAY, ONLINE
- **OrderItem**: Individual items in an order
- **Payment**: Payment records
  - Methods: CASH, CARD, MOMO, PAYSTACK
  - Status: PENDING, PAID, FAILED, REFUNDED
- **DaySession**: Daily business sessions
- **ChatMessage**: Customer support chat

### Relationships
```
User ──┬──> Order (customer)
       ├──> Order (creator - POS)
       └──> Order (preparer - Kitchen)

Category ──> MenuItem ──┬──> PriceVariant
                        ├──> Addon
                        └──> OrderItem

Order ──> OrderItem ──> Payment
```

## 🔌 API Architecture

### RESTful Endpoints
- **Authentication**: `/api/auth/*`
- **Menu**: `/api/menu/*`
- **Orders**: `/api/orders/*`
- **Payments**: `/api/payments/*`
- **Admin**: `/api/admin/*`
- **Kitchen**: `/api/kitchen/*`
- **Settings**: `/api/settings/*`
- **Upload**: `/api/upload/*`
- **Webhooks**: `/api/webhooks/*`

### WebSocket Events
**Client → Server:**
- `join:kitchen` - Join kitchen room
- `order:update` - Update order status
- `chat:message` - Send chat message

**Server → Client:**
- `order:new` - New order created
- `order:updated` - Order updated
- `order:status-changed` - Order status changed
- `payment:confirmed` - Payment confirmed
- `chat:message` - New chat message

## 🔐 Security Architecture

### Authentication & Authorization
- **JWT-based authentication** for REST API
- **Token-based Socket.io authentication**
- **Role-based access control (RBAC)**
- **Password hashing** with bcrypt

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing (configured per environment)
- **Rate Limiting**: Prevent abuse
- **Input Validation**: express-validator
- **File Upload Validation**: Type & size checks

### Data Protection
- **Environment variables** for secrets
- **Webhook signature verification** (Paystack)
- **SQL injection protection** (Prisma ORM)
- **XSS protection** (Helmet)

## 📡 Real-time Architecture

### Socket.io Setup
- **Server**: Express + Socket.io on same HTTP server
- **Authentication**: JWT token in handshake
- **Rooms**: Kitchen room for order updates
- **Transports**: WebSocket with polling fallback
- **Proxy Support**: Railway-compatible configuration

### Event Flow
```
Order Created (POS/Customer)
    ↓
Backend saves to database
    ↓
io.emit('order:new', orderData)
    ↓
KDS receives update
    ↓
Kitchen updates status
    ↓
io.emit('order:updated', orderData)
    ↓
All connected clients update
```

## 🚀 Deployment Architecture

### Development
- **Local**: All services run on localhost
- **Database**: SQLite (file-based)
- **Ports**: 
  - Backend: 5000
  - Customer: 3000
  - POS: 3001
  - KDS: 3002
  - Admin: 3003

### Production (Railway)
- **Monorepo**: Each app deployed as separate service
- **Database**: PostgreSQL (Railway managed)
- **Build Process**:
  1. `npm install` - Install dependencies
  2. `npm run build` - Generate Prisma Client
  3. `npm start` - Run migrations + start server
- **Environment Variables**: Configured per service
- **CORS**: Configured with production URLs

## 🔄 Data Flow Patterns

### State Management
- **Backend**: Stateless API (JWT tokens)
- **Frontend**: 
  - **Zustand** for global state (auth, cart)
  - **React State** for component state
  - **Socket.io** for real-time updates

### Caching Strategy
- **Menu Data**: Fetched on app load, cached in state
- **Order Data**: Real-time via Socket.io + periodic refresh
- **User Data**: Stored in Zustand store

## 📊 Key Features by Application

### Customer App
- Menu browsing with categories
- Shopping cart management
- Online ordering with Paystack
- Order tracking (real-time)
- Order history
- Customer support chat

### POS App
- Walk-in order creation
- Table/takeaway selection
- Multiple payment methods
- Receipt printing
- Discount application
- Real-time kitchen sync
- Sales dashboard

### KDS App
- Real-time order queue
- Order status management
- Preparation timer
- Order filtering & search
- Kitchen reports
- Audio notifications

### Admin App
- Menu management (CRUD)
- Category management
- Staff management
- Order management
- Sales analytics
- Payment transaction logs
- Restaurant settings
- User management

## 🔧 Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Set up environment variables
3. Run migrations: `npx prisma migrate dev`
4. Generate Prisma Client: `npx prisma generate`
5. Start services: Use PowerShell scripts or npm scripts

### Production Deployment
1. Push to GitHub
2. Railway auto-deploys on push
3. Build process runs automatically
4. Migrations run at startup
5. Services become available

## 🎯 Design Principles

1. **Separation of Concerns**: Clear separation between frontend apps
2. **Single Source of Truth**: Backend API as central data source
3. **Real-time Updates**: Socket.io for live data synchronization
4. **Scalability**: Stateless backend, horizontal scaling ready
5. **Security First**: Authentication, authorization, input validation
6. **Developer Experience**: Monorepo, shared utilities, clear structure

## 📈 Scalability Considerations

- **Backend**: Stateless, can scale horizontally
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Local filesystem (can migrate to S3/Cloud Storage)
- **WebSockets**: Socket.io with Redis adapter (for multi-instance)
- **CDN**: Can add for static assets

## 🔍 Monitoring & Logging

- **Morgan**: HTTP request logging
- **Prisma**: Query logging (development)
- **Error Handling**: Centralized error handler
- **Audit Logs**: User action tracking (via auditLog utility)

---

**Last Updated**: 2025-01-25
**Version**: 1.0.0

