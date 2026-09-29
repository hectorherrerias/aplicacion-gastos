import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../auth';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Debes proporcionar usuario y contraseña.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
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

// GET /api/auth/me
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
