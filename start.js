#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting SRS Evaluation Dashboard...');

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Check if frontend build exists
const frontendBuildPath = path.join(__dirname, 'frontend', 'dist');
if (!fs.existsSync(frontendBuildPath)) {
  console.error('❌ Frontend build not found. Please run "npm run build" first.');
  process.exit(1);
}

// Check if backend dependencies are installed
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
if (!fs.existsSync(backendNodeModules)) {
  console.error('❌ Backend dependencies not found. Please run "npm install" in backend directory.');
  process.exit(1);
}

// Start the backend server
console.log('🔧 Starting backend server...');
const serverPath = path.join(__dirname, 'backend', 'server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'backend'),
  env: { ...process.env }
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🛑 Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});