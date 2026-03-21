#!/bin/bash
set -e

echo "🏗️ Railway Build Process Starting..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Initialize database
echo "🗄️ Initializing database..."
cd ../backend
npm run init-db

echo "✅ Railway build complete!"