#!/bin/bash

echo "🏗️ Building SRS Evaluation Dashboard for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install --production
cd ../frontend && npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Initialize database if it doesn't exist
echo "🗄️ Setting up database..."
cd ../backend
if [ ! -f "evaluations.db" ]; then
  echo "Creating new database..."
  npm run init-db
else
  echo "Database already exists"
fi

echo "✅ Build complete!"
echo "🚀 Ready for deployment"