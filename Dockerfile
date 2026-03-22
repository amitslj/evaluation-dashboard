# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install --production
RUN cd frontend && npm install && npm run build
RUN cd backend && npm install --production

# Copy source code
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build frontend
RUN cd frontend && npm run build

# Copy built frontend to backend public directory
RUN mkdir -p backend/public && cp -r frontend/dist/* backend/public/

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
WORKDIR /app/backend
CMD ["node", "server.js"]