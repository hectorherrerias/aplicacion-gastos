import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db, initDatabase } from './db';
import { authRouter } from './routes/auth';
import { expensesRouter } from './routes/expenses';
import { settingsRouter } from './routes/settings';
import { startBackupSchedule } from './backup';

// 1. Initialize SQLite Database
initDatabase();
startBackupSchedule();

// 2. Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust the first proxy hop so req.ip is the real client (used by the rate limiter)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// CORS is only needed when the Vite dev server runs on another port
if (!isProduction) {
  app.use(cors());
}

// Basic security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Larger limit so JSON backup imports with many movements are accepted
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint (also verifies the database answers)
app.get('/api/health', (_req: Request, res: Response) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      service: 'GastosPro Backend API',
      database: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// Unknown API routes return JSON 404 instead of the SPA
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

// Serve frontend static assets in production
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[Server] Serving production frontend build from: ${distPath}`);
  // Hashed assets can be cached forever; index.html must always be revalidated
  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y' })
  );
  app.use(express.static(distPath, { index: false }));

  // SPA fallback middleware for Express 5
  app.use((_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.send({
      message: 'GastosPro Backend API is running.',
      frontendDev: 'In development, run Vite frontend on port 5173 or run "npm run build" to serve both together.',
    });
  });
}

// Centralized error handler (e.g. malformed JSON bodies)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[Server Error]', err);
  res.status(status).json({
    error: status === 413 ? 'El archivo es demasiado grande.' : status === 400 ? 'Petición no válida.' : 'Error interno del servidor.',
  });
});

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 GastosPro Server running on http://localhost:${PORT}`);
  console.log(`🗄️  SQLite Database connected & tables initialized`);
  console.log(`🔑 Default Admin User: "${process.env.ADMIN_USER || 'admin'}"`);
  console.log('====================================================');
});

// Graceful shutdown so SQLite WAL is checkpointed when Docker stops the container
const shutdown = (signal: string) => {
  console.log(`[Server] ${signal} received, closing...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
