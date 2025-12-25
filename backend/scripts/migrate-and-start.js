#!/usr/bin/env node

/**
 * Railway deployment: Combined migration and start script
 * Runs migrations first, then starts the server
 * This ensures migrations are applied before the server accepts connections
 */

require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🚀 Starting backend service...');

// Run migrations first
console.log('');
console.log('Step 1: Running database migrations...');
const migrateScript = path.join(__dirname, 'migrate-runtime.js');

const migrateProcess = spawn('node', [migrateScript], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

migrateProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('');
    console.error('❌ Migrations failed, not starting server');
    process.exit(code);
  }
  
  // Migrations succeeded, start the server
  console.log('');
  console.log('Step 2: Starting server...');
  console.log('');
  
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  
  serverProcess.on('close', (code) => {
    process.exit(code);
  });
  
  // Handle termination signals
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
  });
});

// Handle errors
migrateProcess.on('error', (error) => {
  console.error('❌ Failed to run migrations:', error);
  process.exit(1);
});

