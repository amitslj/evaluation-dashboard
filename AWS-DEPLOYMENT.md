# 🚀 AWS EC2 Deployment Guide

Simple Docker-based deployment for AWS EC2.

## 📋 Prerequisites

- AWS Account
- EC2 instance (t2.micro or larger)
- Security Group allowing port 3001
- SSH access to EC2 instance

## 🎯 Quick Setup

### 1. Launch EC2 Instance

1. **Go to AWS Console** → EC2
2. **Launch Instance:**
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t2.micro (free tier) or t2.small
   - **Key Pair**: Create or select existing
   - **Security Group**: Allow SSH (22) and Custom TCP (3001)

### 2. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. Deploy Application

```bash
# Download deployment script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/evaluation-dashboard/main/deploy-aws.sh

# Make executable
chmod +x deploy-aws.sh

# Run deployment
./deploy-aws.sh
```

### 4. Access Application

Visit: `http://your-ec2-ip:3001`

## 🔧 Manual Deployment

If you prefer manual steps:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/YOUR_USERNAME/evaluation-dashboard.git
cd evaluation-dashboard

# Deploy
docker-compose up -d --build
```

## 📊 Management Commands

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Restart application
docker-compose restart

# Update application
git pull origin main
docker-compose up -d --build
```

## 🔒 Security Group Settings

**Inbound Rules:**
- SSH (22): Your IP
- Custom TCP (3001): 0.0.0.0/0 (or restrict to your IPs)

## 💾 Data Persistence

- Database files are stored in `./data` directory
- Automatically backed up on the host system
- Survives container restarts

## 🎯 Production Considerations

1. **Use Application Load Balancer** for SSL/HTTPS
2. **Set up CloudWatch** for monitoring
3. **Configure backup** for the data directory
4. **Use Elastic IP** for consistent access
5. **Consider RDS** for database if scaling

## 🔧 Troubleshooting

**Container won't start:**
```bash
docker-compose logs app
```

**Port already in use:**
```bash
sudo lsof -i :3001
sudo kill -9 PID
```

**Permission issues:**
```bash
sudo chown -R $USER:$USER ./data
```

## 💰 Cost Estimation

**t2.micro (Free Tier):**
- Instance: Free for 12 months
- Storage: ~$1/month for 8GB
- Data Transfer: First 1GB free

**t2.small (Recommended):**
- Instance: ~$17/month
- Storage: ~$1/month for 8GB
- Data Transfer: First 1GB free

Total: ~$18/month for reliable production deployment