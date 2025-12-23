/**
 * System Health Check Script
 * Run this to verify all systems are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking System Configuration...\n');

const issues = [];
const warnings = [];

// Check backend .env file
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  issues.push('❌ backend/.env file is missing');
  console.log('   Creating backend/.env from template...');
  const envExample = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database (SQLite for development)
DATABASE_URL="file:./prisma/dev.db"

# JWT Authentication (REQUIRED)
JWT_SECRET=${generateRandomSecret()}
JWT_EXPIRE=7d

# Paystack Payment Gateway (Optional for development)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_from_paystack

# CORS Origins (Optional - defaults to allow all in development)
FRONTEND_CUSTOMER_URL=http://localhost:3000
FRONTEND_POS_URL=http://localhost:3001
FRONTEND_KDS_URL=http://localhost:3002
FRONTEND_ADMIN_URL=http://localhost:3003

# Restaurant Information
RESTAURANT_NAME=De Fusion Flame Kitchen
RESTAURANT_ADDRESS=Kasoa New Market Road Opposite Saviour Diagnostic Clinic
RESTAURANT_PHONE=0551796725,0545010103
`;
  fs.writeFileSync(backendEnvPath, envExample);
  console.log('   ✅ Created backend/.env file');
} else {
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  if (!envContent.includes('JWT_SECRET=') || envContent.includes('JWT_SECRET=your-super-secret')) {
    issues.push('❌ JWT_SECRET is missing or not set in backend/.env');
  }
  if (!envContent.includes('DATABASE_URL=')) {
    issues.push('❌ DATABASE_URL is missing in backend/.env');
  }
}

// Check database file
const dbPath = path.join(__dirname, 'backend', 'prisma', 'dev.db');
if (!fs.existsSync(dbPath)) {
  warnings.push('⚠️  Database file not found. Run: cd backend && npx prisma migrate dev');
}

// Check node_modules
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
if (!fs.existsSync(backendNodeModules)) {
  issues.push('❌ Backend dependencies not installed. Run: cd backend && npm install');
}

const frontendApps = ['customer-app', 'pos-app', 'kds-app', 'admin-app'];
frontendApps.forEach(app => {
  const appNodeModules = path.join(__dirname, 'frontend', app, 'node_modules');
  if (!fs.existsSync(appNodeModules)) {
    warnings.push(`⚠️  ${app} dependencies not installed. Run: cd frontend/${app} && npm install`);
  }
});

// Check Prisma client
const prismaClient = path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client');
if (!fs.existsSync(prismaClient)) {
  warnings.push('⚠️  Prisma Client not generated. Run: cd backend && npx prisma generate');
}

// Summary
console.log('\n📊 Summary:\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! System is ready.\n');
  console.log('To start the system:');
  console.log('  1. Backend: cd backend && npm run dev');
  console.log('  2. Customer App: cd frontend/customer-app && npm run dev');
  console.log('  3. POS App: cd frontend/pos-app && npm run dev');
  console.log('  4. KDS App: cd frontend/kds-app && npm run dev');
  console.log('  5. Admin App: cd frontend/admin-app && npm run dev');
} else {
  if (issues.length > 0) {
    console.log('❌ Critical Issues (must fix):');
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }
}

function generateRandomSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}


