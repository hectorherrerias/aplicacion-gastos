import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

// GET /api/settings - Get settings for the logged-in user
settingsRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const rows = db
      .prepare('SELECT key, value FROM user_settings WHERE user_id = ?')
      .all(userId) as Array<{
      key: string;
      value: string;
    }>;

    const settingsMap: Record<string, string> = {
      budget_monthly: '2000',
      currency: 'EUR',
    };

    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('[Settings API Error]', error);
    res.status(500).json({ error: 'Error al obtener ajustes de SQLite.' });
  }
});

// POST /api/settings - Update setting for the logged-in user
settingsRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'Key y value son requeridos.' });
      return;
    }

    db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, ?, ?)').run(
      userId,
      key,
      value.toString()
    );

    res.json({ message: 'Ajuste guardado en SQLite.', key, value });
  } catch (error) {
    console.error('[Settings API Error]', error);
    res.status(500).json({ error: 'Error al actualizar ajuste.' });
  }
});
