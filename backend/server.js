const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
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
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateSocket } = require('./middleware/socketAuth');
const path = require('path');

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in environment variables');
  console.error('   Please set JWT_SECRET in backend/.env');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Filter out undefined values from CORS origins
const corsOrigins = [
  process.env.FRONTEND_CUSTOMER_URL,
  process.env.FRONTEND_POS_URL,
  process.env.FRONTEND_KDS_URL,
  process.env.FRONTEND_ADMIN_URL,
].filter(Boolean); // Remove undefined/null values

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : true, // Allow all origins if none configured
    credentials: true,
  },
});

// Connect to database (async, but don't block server startup)
connectDB().catch((error) => {
  console.error('⚠️  Failed to connect to database. Server will start but API calls may fail.');
  console.error('   Error:', error.message);
  console.error('   Please check your DATABASE_URL in backend/.env');
});

// Middleware
// Configure helmet to allow images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - must be before static files
const corsOptions = {
  origin: corsOrigins.length > 0 ? corsOrigins : true, // Allow all origins if none configured
  credentials: true,
};
app.use(cors(corsOptions));

// Serve uploaded files statically (after CORS)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Set CORS headers for images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More lenient rate limiting for public menu endpoints
const menuLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for menu endpoints
  message: 'Too many requests, please try again later.',
});

// Apply different rate limits
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

// Socket.io authentication middleware
io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', (socket) => {
  // Join room based on user role
  if (socket.user) {
    const roleRoom = `role:${socket.user.role}`;
    socket.join(roleRoom);
  }

  // Kitchen staff joins kitchen room
  socket.on('join:kitchen', () => {
    socket.join('kitchen');
  });

  // POS staff joins pos room
  socket.on('join:pos', () => {
    socket.join('pos');
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('   Stack:', err.stack);
  // Don't exit in production, but log the error
  if (process.env.NODE_ENV === 'production') {
    // In production, you might want to log to an error tracking service
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('   Stack:', err.stack);
  // Exit the process for uncaught exceptions as the app is in an undefined state
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors
httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Please stop the existing process or use a different port.`);
    console.error(`   Run: .\\kill-port-5000.ps1 (from project root)`);
    console.error(`   Or: netstat -ano | findstr :${PORT} then taskkill /PID <pid> /F`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

module.exports = { app, io };

