import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';

// Read-only monthly totals for other apps on the mini PC (Mi Cartera uses them for the savings rate).
// Enabled only when INTERNAL_TOKEN is set; callers send it in the "X-Internal-Token" header.
// INTERNAL_USER picks whose expenses are summed (default: hector).
export const internalRouter = Router();

function tokenOk(req: Request): boolean {
  const expected = process.env.INTERNAL_TOKEN || '';
  const given = String(req.header('x-internal-token') || '');
  if (expected.length < 24 || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

internalRouter.get('/monthly', (req: Request, res: Response) => {
  if (!tokenOk(req)) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  const username = process.env.INTERNAL_USER || 'hector';
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  const months = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month,
              ROUND(SUM(CASE WHEN type = 'refund' THEN 0 ELSE amount END), 2) AS expenses,
              ROUND(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 2) AS refunds,
              COUNT(*) AS count
         FROM expenses WHERE user_id = ?
        GROUP BY month ORDER BY month`
    )
    .all(user.id) as { month: string; expenses: number; refunds: number; count: number }[];
  const cats = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month, category_id AS category,
              ROUND(SUM(CASE WHEN type = 'refund' THEN -amount ELSE amount END), 2) AS total
         FROM expenses WHERE user_id = ?
        GROUP BY month, category_id`
    )
    .all(user.id) as { month: string; category: string; total: number }[];
  const budget = db
    .prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'budget_monthly'")
    .get(user.id) as { value: string } | undefined;
  res.json({
    months: months.map((m) => ({
      ...m,
      net: Math.round((m.expenses - m.refunds) * 100) / 100,
      by_category: Object.fromEntries(cats.filter((c) => c.month === m.month).map((c) => [c.category, c.total])),
    })),
    budget_monthly: budget ? Number(budget.value) || null : null,
  });
});
