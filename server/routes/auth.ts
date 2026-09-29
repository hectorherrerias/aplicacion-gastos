import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../auth';

export const authRouter = Router();

// POST /api/auth/register - Create new user account
authRouter.post('/register', (req: Request, res: Response): void => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Debes indicar un nombre de usuario y una contraseña.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = (name || cleanUsername).trim();

    if (cleanUsername.length < 3) {
      res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existing) {
      res.status(400).json({ error: 'Ese nombre de usuario ya está registrado. Elige otro.' });
      return;
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const createdAt = Date.now();

    // Insert user into SQLite
    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, passwordHash, cleanName, createdAt);

    // Initialize user settings with defaults
    db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, ?, ?)').run(
      userId,
      'budget_monthly',
      '2000'
    );
    db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, ?, ?)').run(
      userId,
      'currency',
      'EUR'
    );

    const token = generateToken({ userId, username: cleanUsername });

    res.status(201).json({
      token,
      user: {
        id: userId,
        username: cleanUsername,
        name: cleanName,
      },
    });
  } catch (error) {
    console.error('[Register API Error]', error);
    res.status(500).json({ error: 'Error al registrar usuario en la base de datos.' });
  }
});

// POST /api/auth/login - Authenticate existing user
authRouter.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Debes proporcionar usuario y contraseña.' });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUsername) as {
    id: string;
    username: string;
    password_hash: string;
    name: string;
  } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const token = generateToken({ userId: user.id, username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
    },
  });
});

// GET /api/auth/me - Validate session
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  const user = db.prepare('SELECT id, username, name, created_at FROM users WHERE id = ?').get(
    req.user.userId
  ) as { id: string; username: string; name: string; created_at: number } | undefined;

  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  res.json({ user });
});

// POST /api/auth/change-password
authRouter.post('/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Debes indicar la contraseña actual y la nueva.' });
    return;
  }

  if (newPassword.length < 4) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId) as {
    password_hash: string;
  } | undefined;

  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.userId);

  res.json({ message: 'Contraseña actualizada correctamente.' });
});
