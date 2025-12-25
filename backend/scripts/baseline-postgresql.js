#!/usr/bin/env node

/**
 * Railway deployment: PostgreSQL Baseline Migration Script
 * 
 * This script creates a fresh PostgreSQL baseline migration.
 * Use this when switching from SQLite to PostgreSQL.
 * 
 * The script:
 * 1. Backs up existing SQLite migrations (if any)
 * 2. Creates a new PostgreSQL baseline migration
 * 3. Marks it as applied so future migrations work correctly
 * 
 * Usage:
 *   node scripts/baseline-postgresql.js
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🔄 Creating PostgreSQL baseline migration...');
console.log('');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required!');
  console.error('');
  console.error('Please set DATABASE_URL in your environment:');
  console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
  console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
  process.exit(1);
}

// Verify it's a PostgreSQL URL
if (!process.env.DATABASE_URL.includes('postgresql://') && !process.env.DATABASE_URL.includes('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string!');
  console.error('   Current format:', process.env.DATABASE_URL.split('@')[0] || 'hidden');
  process.exit(1);
}

try {
  console.log('📋 Step 1: Backing up existing SQLite migrations...');
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  const backupDir = path.join(__dirname, '..', 'prisma', 'migrations_sqlite_backup');
  
  if (fs.existsSync(migrationsDir) && !fs.existsSync(backupDir)) {
    // Only backup if backup doesn't exist
    console.log('   Creating backup of SQLite migrations...');
    fs.mkdirSync(backupDir, { recursive: true });
    
    const migrations = fs.readdirSync(migrationsDir);
    migrations.forEach(migration => {
      if (migration !== 'migration_lock.toml') {
        const src = path.join(migrationsDir, migration);
        const dest = path.join(backupDir, migration);
        if (fs.statSync(src).isDirectory()) {
          fs.cpSync(src, dest, { recursive: true });
        } else {
          fs.copyFileSync(src, dest);
        }
      }
    });
    console.log('   ✅ SQLite migrations backed up to prisma/migrations_sqlite_backup');
  } else if (fs.existsSync(backupDir)) {
    console.log('   ℹ️  Backup already exists, skipping...');
  }
  
  console.log('');
  console.log('📋 Step 2: Creating fresh PostgreSQL baseline...');
  console.log('   This will create a new migration with all current schema changes.');
  console.log('');
  
  // Create a baseline migration
  // This uses `prisma migrate dev --create-only` to create migration without applying
  // Then we'll mark it as applied
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
  const migrationName = `${timestamp}_postgresql_baseline`;
  
  console.log(`   Creating migration: ${migrationName}`);
  
  // First, ensure migration_lock.toml is set to postgresql
  const lockFile = path.join(migrationsDir, 'migration_lock.toml');
  if (fs.existsSync(lockFile)) {
    let lockContent = fs.readFileSync(lockFile, 'utf8');
    if (lockContent.includes('provider = "sqlite"')) {
      lockContent = lockContent.replace('provider = "sqlite"', 'provider = "postgresql"');
      fs.writeFileSync(lockFile, lockContent);
      console.log('   ✅ Updated migration_lock.toml to postgresql');
    }
  }
  
  // Create the migration using Prisma
  // Note: This requires the database to be accessible
  console.log('   Generating migration from schema...');
  execSync('npx prisma migrate dev --name postgresql_baseline --create-only', {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('');
  console.log('📋 Step 3: Applying baseline migration...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('');
  console.log('✅ PostgreSQL baseline migration created and applied successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Future migrations will be PostgreSQL-compatible');
  console.log('   2. Old SQLite migrations are backed up in prisma/migrations_sqlite_backup');
  console.log('   3. You can delete the backup folder if not needed');
  
} catch (error) {
  console.error('');
  console.error('❌ Failed to create PostgreSQL baseline');
  console.error('   Error:', error.message || error);
  console.error('');
  console.error('📋 Troubleshooting:');
  console.error('   1. Verify DATABASE_URL is correct and database is accessible');
  console.error('   2. Ensure database is empty or you can accept data loss');
  console.error('   3. Try running: npx prisma db push --accept-data-loss');
  console.error('   4. Then: npx prisma migrate dev --name postgresql_baseline');
  process.exit(1);
}

