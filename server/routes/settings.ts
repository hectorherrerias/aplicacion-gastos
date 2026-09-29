import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

// GET /api/settings
settingsRouter.get('/', (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const settingsMap: Record<string, string> = {};
    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('[Settings API Error]', error);
    res.status(500).json({ error: 'Error al obtener ajustes de SQLite.' });
  }
});

// POST /api/settings
settingsRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'Key y value son requeridos.' });
      return;
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      key,
      value.toString()
    );

    res.json({ message: 'Ajuste guardado en SQLite.', key, value });
  } catch (error) {
    console.error('[Settings API Error]', error);
    res.status(500).json({ error: 'Error al actualizar ajuste.' });
  }
});
