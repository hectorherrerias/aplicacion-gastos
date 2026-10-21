import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Secrets that were shipped in older versions of the repo and must never be used as real keys
const KNOWN_DEFAULT_SECRETS = new Set([
  'gastospro_super_secret_jwt_key_2026',
  'gastospro_secure_jwt_token_secret_key_2026',
  'gastospro_secure_jwt_token_secret_key_2026_change_me',
]);

// Resolve the JWT secret: use JWT_SECRET from env if it is a real value,
// otherwise generate a random one once and persist it in the data volume
// so sessions survive container restarts.
const resolveJwtSecret = (): string => {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv && !KNOWN_DEFAULT_SECRETS.has(fromEnv)) {
    return fromEnv;
  }

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const secretFile = path.join(dataDir, '.jwt_secret');

  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, 'utf-8').trim();
      if (stored) return stored;
    }
    fs.mkdirSync(dataDir, { recursive: true });
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.log(`[Auth] Generated new random JWT secret at ${secretFile}`);
    return generated;
  } catch (err) {
    console.error('[Auth] Could not persist JWT secret, using an ephemeral one:', err);
    return crypto.randomBytes(48).toString('hex');
  }
};

const JWT_SECRET = resolveJwtSecret();

export interface AuthPayload {
  userId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
};

// Simple in-memory rate limiter for login/register (per IP, sliding window)
const attempts = new Map<string, number[]>();

export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.path}:${req.ip}`;
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= maxAttempts) {
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(retryAfter / 60)} minuto(s).`,
      });
      return;
    }

    recent.push(now);
    attempts.set(key, recent);
    next();
  };
};

// Periodically drop stale entries so the map does not grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, list] of attempts) {
    if (list.every((t) => now - t > 60 * 60 * 1000)) attempts.delete(key);
  }
}, 10 * 60 * 1000).unref();
