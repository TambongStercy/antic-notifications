# Base image with heavy system dependencies (cached layer)
FROM node:20-alpine AS base

# Install all system dependencies in one layer for maximum caching
RUN apk update && apk add --no-cache \
    # Build dependencies (needed for npm install)
    python3 make g++ cairo-dev pango-dev \
    # Runtime dependencies for WhatsApp/Puppeteer
    chromium nss freetype ca-certificates cairo pango

# Build stage - inherits cached system dependencies
FROM base AS builder

WORKDIR /app

# Copy package files first for better npm cache
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (dev + prod) for build
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage - also inherits cached system dependencies
FROM base AS production

# System dependencies already installed in base layer - no additional downloads needed!

# Build arguments for configurable environment variables (after heavy operations)
ARG MONGODB_URI=mongodb://172.17.0.1:27017/notification-service
ARG NODE_ENV=production

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create directories for WhatsApp sessions and logs
RUN mkdir -p ./sessions/whatsapp ./logs && \
    chown -R nodejs:nodejs ./sessions ./logs ./dist

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set configurable environment variables using ARGs
ENV MONGODB_URI=${MONGODB_URI}
ENV NODE_ENV=${NODE_ENV}

# Switch to non-root user
USER nodejs

# Expose ports for HTTP, HTTPS, and WebSocket
EXPOSE 3000 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["node", "dist/index.js"]
