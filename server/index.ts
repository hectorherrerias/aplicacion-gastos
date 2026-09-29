import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db';
import { authRouter } from './routes/auth';
import { expensesRouter } from './routes/expenses';
import { settingsRouter } from './routes/settings';

// 1. Initialize SQLite Database
initDatabase();

// 2. Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'GastosPro Backend API',
    database: 'SQLite (auto-initialized)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static assets in production
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[Server] Serving production frontend build from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback middleware for Express 5
  app.use((_req: Request, res: Response) => {
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

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 GastosPro Server running on http://localhost:${PORT}`);
  console.log(`🗄️  SQLite Database connected & tables initialized`);
  console.log(`🔑 Default Admin User: "${process.env.ADMIN_USER || 'admin'}"`);
  console.log('====================================================');
});
