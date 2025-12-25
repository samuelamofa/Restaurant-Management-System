#!/usr/bin/env node

/**
 * Railway Production: Fail-Safe Migration and Start Script
 * 
 * This script safely runs database migrations before starting the server.
 * It's designed to prevent Railway restart loops by handling migration failures gracefully.
 * 
 * Behavior:
 * - Runs `prisma migrate deploy` to apply pending migrations
 * - If migrations succeed or are already applied (exit code 0), starts the server
 * - If migrations fail with recoverable errors, logs warnings but continues to start server
 * - Only exits with code 1 for critical errors that prevent the app from running
 * 
 * Railway Production Notes:
 * - Prisma CLI must be in dependencies (not devDependencies) for production
 * - Migrations run at startup, not during build (build runs `prisma generate` only)
 * - If migrations are already applied, `prisma migrate deploy` exits with code 0
 * - This prevents restart loops because we don't exit on non-critical migration failures
 */

require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Change to backend directory to ensure relative paths work correctly
process.chdir(path.join(__dirname, '..'));

console.log('🚀 Starting backend service...');
console.log('');

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required!');
  console.error('');
  console.error('Please set DATABASE_URL in your deployment environment:');
  console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
  console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
  console.error('');
  process.exit(1);
}

/**
 * Runs `prisma migrate deploy` to apply pending migrations
 * 
 * Important: `prisma migrate deploy` exits with code 0 if:
 * - Migrations are successfully applied
 * - All migrations are already applied (up to date)
 * 
 * It only exits with non-zero code if there's an actual error.
 * Even in error cases, we start the server to prevent Railway restart loops.
 * The server will fail at runtime if there are critical database issues.
 * 
 * Returns: { success: boolean, exitCode: number }
 */
function runMigrations() {
  return new Promise((resolve) => {
    console.log('📋 Running database migrations...');
    console.log('   Command: npx prisma migrate deploy');
    console.log('');

    const migrateProcess = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit', // Pipe output directly to console for Railway logs
      env: process.env,
      shell: true,
    });

    // Handle process execution errors (e.g., command not found)
    migrateProcess.on('error', (error) => {
      console.error('');
      console.error('❌ Failed to execute migration command:', error.message || String(error));
      console.error('   This may indicate Prisma CLI is not installed');
      console.error('   Server will start anyway to prevent restart loop');
      console.error('   Check that "prisma" is in dependencies (not devDependencies)');
      console.log('');
      resolve({
        success: false,
        exitCode: 1,
      });
    });

    migrateProcess.on('close', (code) => {
      if (code === 0) {
        // Success: migrations applied or already up to date
        console.log('');
        console.log('✅ Database migrations completed successfully');
        console.log('   (Migrations were applied or already up to date)');
        console.log('');
        resolve({ success: true, exitCode: 0 });
      } else {
        // Migration failed with non-zero exit code
        // Note: We log a warning but still resolve (not reject) to continue execution
        // This prevents Railway restart loops. The server will handle runtime errors.
        console.log('');
        console.warn('⚠️  Migration deployment exited with code:', code);
        console.warn('   This indicates a migration error occurred');
        console.warn('   Server will start anyway to prevent restart loops');
        console.warn('   Check logs above for migration error details');
        console.warn('   If database is not ready, server will fail at runtime');
        console.log('');
        resolve({
          success: false,
          exitCode: code,
        });
      }
    });
  });
}

/**
 * Starts the Express server
 * This function never returns - it runs the server process
 */
function startServer() {
  console.log('🚀 Starting Express server...');
  console.log('');

  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit', // Pipe output directly to console
    env: process.env,
    shell: true,
  });

  // Forward exit code from server process
  serverProcess.on('close', (code) => {
    console.log('');
    console.log(`Server process exited with code ${code}`);
    process.exit(code || 0);
  });

  // Handle termination signals (Railway sends SIGTERM for graceful shutdown)
  process.on('SIGTERM', () => {
    console.log('');
    console.log('📡 Received SIGTERM signal, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('');
    console.log('📡 Received SIGINT signal, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });

  // Handle server process errors
  serverProcess.on('error', (error) => {
    console.error('');
    console.error('❌ Failed to start server:', error.message || String(error));
    console.error('');
    process.exit(1);
  });
}

/**
 * Main execution flow
 * 
 * Railway Production Behavior:
 * 1. Runs migrations first (fail-safe: continues even if migrations fail)
 * 2. Always starts the server (prevents restart loops)
 * 3. Server will fail at runtime if there are critical database issues
 *    (better than infinite restart loop on Railway)
 */
async function main() {
  try {
    // Step 1: Attempt to run migrations
    // Note: runMigrations() always resolves (never rejects) to prevent crashes
    const migrationResult = await runMigrations();

    // Step 2: Log migration status summary
    if (!migrationResult.success) {
      console.warn('⚠️  Migrations did not complete successfully');
      console.warn('   Exit code:', migrationResult.exitCode);
      console.warn('   Server will start anyway to prevent Railway restart loops');
      console.warn('   If database is not ready, server will fail at runtime');
      console.log('');
    }

    // Step 3: Start the server (this function never returns unless server exits)
    // The server process handles its own errors and will exit with appropriate codes
    startServer();
  } catch (error) {
    // This catch block should rarely execute since runMigrations() always resolves
    // Handle unexpected errors gracefully to prevent restart loops
    console.error('');
    console.error('❌ Unexpected error in migration/start script:', error);
    console.error('   Error details:', error.message || String(error));
    console.error('');
    console.error('⚠️  Starting server anyway to prevent restart loop...');
    console.error('   Server may fail at runtime if database is not ready');
    console.log('');
    startServer();
  }
}

// Execute main flow
main();