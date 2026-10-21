# ==============================================================================
# GastosPro - Multi-Stage Production Dockerfile (SQLite + Node.js + React)
# ==============================================================================

# --- Stage 1: Build the React Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Instalar herramientas para compilar módulos nativos durante npm ci
RUN apk add --no-cache python3 make g++

# Instalar todas las dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar el frontend (React/Vite)
COPY . .
RUN npm run build

# --- Stage 2: Production Server Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DATABASE_FILE=/app/data/database.sqlite

# Instalar herramientas temporales de compilación
RUN apk add --no-cache python3 make g++

# Copiar manifiestos e instalar solo dependencias de producción + tsx para ejecución
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm rebuild better-sqlite3 && \
    npm install -g tsx && \
    apk del python3 make g++

# Copiar archivos compilados del frontend y el código del backend
COPY --from=frontend-builder /app/dist ./dist
COPY server ./server
COPY tsconfig*.json ./

# Crear directorio de datos para SQLite y ajustar permisos del usuario node
RUN mkdir -p /app/data && chown -R node:node /app

# Ejecutar como usuario sin privilegios
USER node

# Exponer el puerto interno
EXPOSE 3000

# Verificación de salud
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Arrancar la aplicación
CMD ["tsx", "server/index.ts"]
