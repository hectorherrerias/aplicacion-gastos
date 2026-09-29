# ==============================================================================
# GastosPro - Multi-Stage Production Dockerfile (SQLite + Node.js + React)
# ==============================================================================

# --- Stage 1: Build the React Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and compile frontend
COPY . .
RUN npm run build

# --- Stage 2: Production Server Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DATABASE_FILE=/app/data/database.sqlite

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm rebuild better-sqlite3

# Copy backend TypeScript/JavaScript files and built frontend assets
COPY --from=frontend-builder /app/dist ./dist
COPY server ./server
COPY tsconfig*.json ./

# Create directory for persistent SQLite database
RUN mkdir -p /app/data && chown -R node:node /app

# Run as non-root user for security
USER node

# Expose server port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application using tsx or node
CMD ["npx", "tsx", "server/index.ts"]
