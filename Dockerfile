# Production Dockerfile for Railway deployment from repository root
# This file handles building from the monorepo root

# Multi-stage build for production
FROM node:22-slim AS builder

# Set working directory to backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/backend/dist ./dist

# Copy Google Cloud credentials if needed
COPY --from=builder /app/backend/config ./config

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
# Force redeploy - fixed start command to include .js extension
CMD ["node", "dist/src/main.js"]
