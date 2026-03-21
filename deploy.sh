#!/bin/bash

echo "🏗️ Deployment Build Script for Railway"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Install frontend dependencies  
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Setup database
echo "🗄️ Setting up database..."
cd ../backend
npm run init-db

echo "✅ Deployment build complete!"
echo "🚀 Ready to start with: npm start"