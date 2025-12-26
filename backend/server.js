const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const kitchenRoutes = require('./routes/kitchen');
const webhookRoutes = require('./routes/webhooks');
const settingsRoutes = require('./routes/settings');
const daySessionRoutes = require('./routes/daySession');
const uploadRoutes = require('./routes/upload');
const chatRoutes = require('./routes/chat');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');
const fs = require('fs');

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Ensure uploads directory exists at runtime (only for non-serverless)
if (!isVercel) {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
  }
}

// Validate required environment variables (don't exit on Vercel)
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in environment variables');
  console.error('   Please set JWT_SECRET in your environment variables');
  if (!isVercel) {
    process.exit(1);
  }
}

const app = express();

// Trust proxy for correct IP addresses and protocol
app.set('trust proxy', 1);

// CORS origins from environment variables
// Use FRONTEND_PROD_URL and FRONTEND_DEV_URL as primary sources
const corsOrigins = [
  process.env.FRONTEND_PROD_URL,
  process.env.FRONTEND_DEV_URL,
  process.env.FRONTEND_CUSTOMER_URL,
  process.env.FRONTEND_POS_URL,
  process.env.FRONTEND_KDS_URL,
  process.env.FRONTEND_ADMIN_URL,
].filter(Boolean); // Remove undefined/null values

// Production safety: Warn if no CORS origins in production
if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
  console.warn('⚠️  WARNING: No CORS origins configured in production!');
  console.warn('   Please set FRONTEND_PROD_URL or FRONTEND_DEV_URL environment variables.');
  console.warn('   Allowing all origins as fallback (NOT RECOMMENDED FOR PRODUCTION)');
}

// Socket.io setup (only for non-serverless environments)
let io = null;
if (!isVercel) {
  try {
    const { createServer } = require('http');
    const { Server } = require('socket.io');
    const { authenticateSocket } = require('./middleware/socketAuth');
    
    const httpServer = createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: corsOrigins.length > 0 ? corsOrigins : (process.env.NODE_ENV === 'production' ? false : true),
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      trustProxy: true,
    });

    // Socket.io authentication middleware
    io.use(authenticateSocket);

    // Socket.io connection handling
    io.on('connection', (socket) => {
      if (socket.user) {
        const roleRoom = `role:${socket.user.role}`;
        socket.join(roleRoom);
        socket.join(`user:${socket.user.id}`);
      }

      socket.on('join:kitchen', () => {
        socket.join('kitchen');
      });

      socket.on('join:pos', () => {
        socket.join('pos');
      });

      socket.on('join:user', (userId) => {
        if (socket.user && socket.user.id === userId) {
          socket.join(`user:${userId}`);
        }
      });
    });

    // Make io available to routes
    app.set('io', io);
  } catch (error) {
    console.warn('⚠️  Socket.io initialization failed (this is normal on serverless):', error.message);
  }
} else {
  // On Vercel, provide a mock io object to prevent crashes
  io = {
    emit: () => {},
    to: () => ({ emit: () => {} }),
    use: () => {},
    on: () => {},
  };
  app.set('io', io);
}

// Connect to database (async, but don't block server startup)
// On Vercel, database connections are handled per-request in serverless functions
// For local development, connect at startup
if (!isVercel) {
  connectDB().catch((error) => {
    console.error('⚠️  Failed to connect to database. Server will start but API calls may fail.');
    console.error('   Error:', error.message);
    console.error('   Please check your DATABASE_URL in your environment variables');
  });
}

// Middleware
// Configure helmet to allow images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // Disable CSP in production for flexibility
}));
// Production-safe logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - must be before static files
// Production safety: Require CORS origins in production
const corsOptions = {
  origin: corsOrigins.length > 0 
    ? corsOrigins 
    : (process.env.NODE_ENV === 'production' ? false : true), // Strict in production, allow all in dev
  credentials: true,
};
app.use(cors(corsOptions));

// Serve uploaded files statically (after CORS) - only for non-serverless
// On Vercel, use Vercel Blob Storage or similar for file uploads
if (!isVercel) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
      // Set CORS headers for images
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }));
}

// Rate limiting - production-safe with environment-based limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Stricter in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// More lenient rate limiting for public menu endpoints
const menuLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 500, // Stricter in production
  message: 'Too many requests, please try again later.',
});

// More lenient rate limiting for auth endpoints (login, register, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 50, // Allow more login attempts
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// More lenient rate limiting for chat endpoints (messaging)
// In development, allow much more requests to prevent rate limiting during development
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Much higher limit in dev
  message: 'Too many messages, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Apply different rate limits (order matters - more specific routes first)
app.use('/api/auth', authLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/menu', menuLimiter);
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/day-session', daySessionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);

// Root route handler for Vercel health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'De Fusion Flame Kitchen RMS API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections (don't exit on Vercel)
if (!isVercel) {
  process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    console.error('   Stack:', err.stack);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.error('   Stack:', err.stack);
    process.exit(1);
  });

  // Graceful shutdown handling (only for non-serverless)
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    if (io && io.close) {
      io.close(() => {
        console.log('✅ Socket.io server closed');
      });
    }
    
    const { disconnectDB } = require('./config/database');
    await disconnectDB();
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start server only if not on Vercel
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';
  
  const { createServer } = require('http');
  const httpServer = createServer(app);
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`🌐 Production mode - Server accessible on port ${PORT}`);
    } else {
      console.log(`🌐 Development mode - Server accessible at http://localhost:${PORT}`);
    }
  });

  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error(`   Please stop the existing process or use a different port.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}

// Export app for Vercel serverless functions
// Vercel will use this as the handler for /api/* routes
module.exports = app;