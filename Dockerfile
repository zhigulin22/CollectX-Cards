# Multi-stage build for CollectX Cards App

# ============ BACKEND ============
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Install pnpm
RUN npm install -g pnpm

# Copy backend files
COPY backend/package.json backend/pnpm-lock.json* ./
RUN pnpm install --frozen-lockfile

COPY backend/ ./
RUN pnpm run build

# ============ FRONTEND ============
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install pnpm
RUN npm install -g pnpm

# Copy frontend files
COPY frontend/package.json frontend/pnpm-lock.json* ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# ============ PRODUCTION ============
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies for backend
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.json* ./
RUN pnpm install --prod --frozen-lockfile

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma

# Copy built frontend to backend public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start script
CMD ["node", "dist/index.js"]

