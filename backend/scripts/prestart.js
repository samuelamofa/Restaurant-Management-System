#!/usr/bin/env node

/**
 * Prestart script for Railway/Production deployment
 * Handles Prisma client generation and migrations
 */

require('dotenv').config();

const { execSync } = require('child_process');
const path = require('path');

// Change to backend directory (scripts/.. = backend/)
process.chdir(path.join(__dirname, '..'));

console.log('🔧 Running prestart script...');
console.log('📁 Working directory:', process.cwd());

// For prisma generate, we can use a dummy DATABASE_URL if not set
// Prisma generate only needs it for schema validation, not actual connection
const generateEnv = { ...process.env };
if (!generateEnv.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set, using dummy URL for Prisma generate...');
  generateEnv.DATABASE_URL = 'postgresql://user:password@localhost:5432/dummy?schema=public';
}

try {
  console.log('');
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: generateEnv,
  });
  console.log('✅ Prisma Client generated successfully');
  
  // For migrations, DATABASE_URL is required
  if (!process.env.DATABASE_URL) {
    console.error('');
    console.error('❌ ERROR: DATABASE_URL environment variable is required for migrations!');
    console.error('');
    console.error('Please set DATABASE_URL in your deployment environment:');
    console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
    console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
    console.error('');
    console.error('If using Railway PostgreSQL:');
    console.error('  1. Go to your PostgreSQL service');
    console.error('  2. Click on Variables tab');
    console.error('  3. Copy the DATABASE_URL value');
    console.error('  4. Add it to your backend service Variables');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set for migrations');
  console.log('🔑 Database host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden');
  
  console.log('');
  console.log('🗄️  Setting up database schema...');
  
  // Try to run migrations first
  try {
    console.log('   Attempting to run migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully');
  } catch (migrateError) {
    // Extract error message - execSync includes stderr in the error
    const errorMessage = migrateError.message || String(migrateError);
    const errorCode = migrateError.status || migrateError.code;
    
    // Check for provider mismatch error (P3019)
    // This error occurs when migration_lock.toml has different provider than schema
    if (errorMessage.includes('P3019') || 
        errorMessage.includes('migration_lock') || 
        errorMessage.includes('provider') ||
        errorMessage.includes('does not match') ||
        errorMessage.includes('sqlite') && errorMessage.includes('postgresql')) {
      console.log('');
      console.warn('⚠️  Migration provider mismatch detected (SQLite → PostgreSQL)');
      console.warn('   This is normal when switching from local SQLite to production PostgreSQL');
      console.warn('   Using prisma db push for initial schema setup...');
      console.log('');
      
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          env: process.env,
        });
        console.log('');
        console.log('✅ Database schema pushed successfully');
        console.log('');
        console.log('💡 Tip: For future deployments, consider creating PostgreSQL migrations:');
        console.log('   npx prisma migrate dev --name init_postgresql');
      } catch (pushError) {
        console.error('');
        console.error('❌ Failed to push database schema');
        throw pushError;
      }
    } else {
      // Other migration errors - rethrow with context
      console.error('');
      console.error('❌ Migration failed');
      throw migrateError;
    }
  }
  
  console.log('');
  console.log('✅ Prestart script completed successfully!');
} catch (error) {
  console.error('');
  console.error('❌ Prestart script failed!');
  if (error.message) {
    console.error('Error:', error.message);
  }
  if (error.stdout) {
    console.error('Output:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('Error output:', error.stderr.toString());
  }
  process.exit(1);
}

