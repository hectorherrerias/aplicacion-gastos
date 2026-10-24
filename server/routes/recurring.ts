import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { generateRecurring, monthKey, previousMonth } from '../recurring';

export const recurringRouter = Router();
recurringRouter.use(authMiddleware);

const PAYMENT_METHODS = ['tarjeta', 'efectivo', 'bizum', 'transferencia', 'otro'];

const mapRow = (r: any) => ({
  id: r.id,
  amount: Number(r.amount),
  categoryId: r.category_id,
  description: r.description,
  paymentMethod: r.payment_method,
  dayOfMonth: r.day_of_month,
  active: Boolean(r.active),
  lastMonth: r.last_month,
});

const cents = (v: unknown) => Math.round(Number(v) * 100) / 100;

const validate = (body: any) => {
  const amount = cents(body.amount);
  const day = Number(body.dayOfMonth);
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!(amount > 0)) return 'El importe debe ser un número positivo.';
  if (!Number.isInteger(day) || day < 1 || day > 31) return 'El día del mes debe estar entre 1 y 31.';
  if (!description || description.length > 200) return 'Pon una descripción (máximo 200 caracteres).';
  if (!body.categoryId || typeof body.categoryId !== 'string') return 'Elige una categoría.';
  return null;
};

// GET /api/recurring - Rules of the logged-in user
recurringRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const rows = db.prepare('SELECT * FROM recurring WHERE user_id = ? ORDER BY day_of_month, description').all(req.user!.userId);
  res.json({ recurring: rows.map(mapRow) });
});

// POST /api/recurring - New rule. includeCurrent: also create this month's movement if its day has passed
recurringRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const error = validate(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const userId = req.user!.userId;
  const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const current = monthKey(new Date());
  const last = req.body.includeCurrent === false ? current : previousMonth(current);
  const method = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'tarjeta';
  db.prepare(`
    INSERT INTO recurring (id, user_id, amount, category_id, description, payment_method, day_of_month, active, last_month, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, userId, cents(req.body.amount), req.body.categoryId, req.body.description.trim(), method,
    Number(req.body.dayOfMonth), last, Date.now());
  const created = generateRecurring(userId);
  res.status(201).json({ recurring: mapRow(db.prepare('SELECT * FROM recurring WHERE id = ?').get(id)), created });
});

// PUT /api/recurring/:id - Edit or pause/resume a rule (affects only future months)
recurringRouter.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.userId;
  const existing = db.prepare('SELECT * FROM recurring WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Gasto fijo no encontrado.' });
    return;
  }
  const merged = { ...mapRow(existing), ...req.body };
  const error = validate(merged);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  // When resuming a paused rule, don't create the months it was paused
  const resuming = !existing.active && merged.active;
  const last = resuming ? previousMonth(monthKey(new Date())) : existing.last_month;
  db.prepare(`
    UPDATE recurring SET amount = ?, category_id = ?, description = ?, payment_method = ?, day_of_month = ?, active = ?, last_month = ?
    WHERE id = ? AND user_id = ?
  `).run(cents(merged.amount), merged.categoryId, String(merged.description).trim(),
    PAYMENT_METHODS.includes(merged.paymentMethod) ? merged.paymentMethod : 'tarjeta', Number(merged.dayOfMonth),
    merged.active ? 1 : 0, last > existing.last_month ? last : existing.last_month, req.params.id, userId);
  const created = generateRecurring(userId);
  res.json({ recurring: mapRow(db.prepare('SELECT * FROM recurring WHERE id = ?').get(req.params.id)), created });
});

// DELETE /api/recurring/:id - Removes the rule; movements already created stay
recurringRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const info = db.prepare('DELETE FROM recurring WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.userId);
  if (!info.changes) {
    res.status(404).json({ error: 'Gasto fijo no encontrado.' });
    return;
  }
  res.json({ ok: true });
});
