#!/bin/bash

# AWS EC2 Deployment Script for SRS Evaluation Dashboard
# Run this script on your EC2 instance

echo "🚀 Starting deployment of SRS Evaluation Dashboard..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone or update repository
if [ -d "evaluation-dashboard" ]; then
    echo "📥 Updating existing repository..."
    cd evaluation-dashboard
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/YOUR_USERNAME/evaluation-dashboard.git
    cd evaluation-dashboard
fi

# Create data directory for persistent storage
mkdir -p data

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start the application
echo "🔨 Building and starting application..."
docker-compose up -d --build

# Show status
echo "📊 Deployment status:"
docker-compose ps

echo "✅ Deployment complete!"
echo "🌐 Application should be available at: http://YOUR_EC2_IP:3001"
echo "🔍 Check logs with: docker-compose logs -f"