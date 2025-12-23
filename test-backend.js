/**
 * Quick Backend Test Script
 * Tests if backend can start without errors
 */

console.log('🧪 Testing Backend Configuration...\n');

// Test 1: Check if .env is loaded
require('dotenv').config({ path: './backend/.env' });

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in backend/.env');
  process.exit(1);
} else {
  console.log('✅ JWT_SECRET is set');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in backend/.env');
  process.exit(1);
} else {
  console.log('✅ DATABASE_URL is set:', process.env.DATABASE_URL);
}

// Test 2: Check if Prisma Client can be imported
try {
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma Client can be imported');
} catch (error) {
  console.error('❌ Cannot import Prisma Client:', error.message);
  console.error('   Run: cd backend && npx prisma generate');
  process.exit(1);
}

// Test 3: Check if database config can be loaded
try {
  const dbConfig = require('./backend/config/database');
  if (dbConfig.prisma) {
    console.log('✅ Database config loaded successfully');
  } else {
    console.error('❌ Database config missing prisma client');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Cannot load database config:', error.message);
  process.exit(1);
}

// Test 4: Try to connect to database
async function testConnection() {
  try {
    const { prisma } = require('./backend/config/database');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    await prisma.$disconnect();
    console.log('\n✅ All tests passed! Backend is ready to start.');
    console.log('\nTo start the backend:');
    console.log('  cd backend && npm run dev');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Check your DATABASE_URL in backend/.env');
    console.error('   For SQLite, it should be: file:./prisma/dev.db');
    process.exit(1);
  }
}

testConnection();


