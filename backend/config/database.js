const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
const disconnectDB = async () => {
  try {
    if (isConnected) {
      await prisma.$disconnect();
      isConnected = false;
      console.log('✅ Database disconnected gracefully');
    }
  } catch (error) {
    console.error('⚠️  Error disconnecting from database:', error.message);
  }
};

// Handle various shutdown signals
process.on('beforeExit', disconnectDB);
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

let isConnected = false;

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (retryCount = 0) => {
  try {
    await prisma.$connect();
    isConnected = true;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    isConnected = false;
    
    // If we haven't exceeded max retries, try again
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
        MAX_RETRY_DELAY
      );
      
      console.warn(`⚠️  Database connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
      console.log(`   Retrying in ${delay}ms...`);
      
      await wait(delay);
      return connectDB(retryCount + 1);
    }
    
    // Max retries exceeded
    console.error('❌ Database connection error after', MAX_RETRIES, 'attempts:', error.message);
    console.error('   Please check your DATABASE_URL in backend/.env');
    console.error('   For SQLite, it should be: file:./prisma/dev.db');
    // Don't exit - let the server start and handle errors gracefully
    // The server will still start but API calls will fail
    throw error;
  }
};

// Helper to check if database is connected
const checkConnection = async (retryCount = 0) => {
  if (!isConnected) {
    try {
      await prisma.$connect();
      isConnected = true;
      return true;
    } catch (error) {
      isConnected = false;
      
      // Retry connection check if we haven't exceeded max retries
      if (retryCount < 2) { // Fewer retries for checkConnection
        const delay = INITIAL_RETRY_DELAY * (retryCount + 1);
        await wait(delay);
        return checkConnection(retryCount + 1);
      }
      
      return false;
    }
  }
  return true;
};

// Export both connectDB function and prisma client
// This ensures prisma is always available even if connectDB hasn't been called yet
// Export as object to allow both default and named imports
module.exports = {
  connectDB,
  disconnectDB,
  prisma,
  checkConnection,
  isConnected: () => isConnected,
};
// Also set as default for backward compatibility
module.exports.default = connectDB;

