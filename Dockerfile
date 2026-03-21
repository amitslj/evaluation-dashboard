# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production --silent
RUN cd backend && npm ci --only=production --silent
RUN cd frontend && npm ci --silent

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Initialize database
RUN cd backend && npm run init-db

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]