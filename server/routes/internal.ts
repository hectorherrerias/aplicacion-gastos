import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';

// Internal API for other apps on the mini PC: monthly totals (Mi Cartera, savings rate) and adding expenses (bot, Jarvis Control).
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

// ---------------------------------------------------------------------------------------------------------------
// Apuntar gastos desde el bot de Telegram y Jarvis Control («12 € café», «gasolina 50 euros»).
// Si no llega categoría, se deduce de los gastos anteriores con palabras parecidas y, si no hay, por palabras clave.
// Solo se pueden borrar (deshacer) los apuntados por esta vía en las últimas 24 horas.

const CATEGORIAS = ['vivienda', 'alimentacion', 'transporte', 'ocio', 'salud', 'educacion', 'otros'];
const METODOS = ['tarjeta', 'efectivo', 'bizum', 'transferencia', 'otro'];
const CLAVES: [RegExp, string][] = [
  [/\b(alquiler|luz|agua|gas|internet|fibra|comunidad|hipoteca|ikea|mueble|casa|piso|limpieza)\b/, 'vivienda'],
  [/\b(gasolina|diesel|gasoil|parking|aparcamiento|peaje|metro|bus|autobus|tren|renfe|cercanias|taxi|uber|cabify|bolt|abono|transporte|itv|taller|coche|vuelo)\b/, 'transporte'],
  [/\b(farmacia|medic\w*|dentista|fisio\w*|optica|gafas|lentillas|seguro medico|analisis|hospital|consulta)\b/, 'salud'],
  [/\b(curso|libro\w*|academia|matricula|universidad|master|clase\w*|formacion|udemy|tajamar)\b/, 'educacion'],
  [/\b(cine|concierto|entradas?|netflix|spotify|hbo|disney|prime|juego\w*|ps5|steam|copas|fiesta|escapada|viaje|hotel|gimnasio|gym|padel|futbol|partido)\b/, 'ocio'],
  [/\b(super\w*|mercadona|carrefour|lidl|dia|alcampo|aldi|compra|comida|cena|desayuno|almuerzo|merienda|cafe|restaurante|bar|kfc|mcdonalds|burger|pizza|kebab|sushi|glovo|just eat|uber eats|pan|fruta)\b/, 'alimentacion'],
];
const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VACIAS = new Set(['con', 'para', 'por', 'del', 'los', 'las', 'una', 'uno', 'que', 'mas', 'muy']);
const palabras = (s: string) => plano(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));

function usuario(req: Request, res: Response): string | null {
  if (!tokenOk(req)) {
    res.status(401).json({ error: 'No autorizado.' });
    return null;
  }
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.INTERNAL_USER || 'hector') as { id: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return null;
  }
  return user.id;
}

function deducirCategoria(userId: string, descripcion: string): { categoria: string; como: string } {
  const mias = palabras(descripcion);
  if (mias.length) {
    const previos = db
      .prepare("SELECT description, category_id FROM expenses WHERE user_id = ? AND type = 'expense' ORDER BY created_at DESC LIMIT 500")
      .all(userId) as { description: string; category_id: string }[];
    const puntos: Record<string, number> = {};
    const ejemplo: Record<string, string> = {};
    for (const p of previos) {
      const suyas = palabras(p.description);
      const n = mias.filter((w) => suyas.some((s) => s === w || (w.length >= 5 && s.length >= 5 && s.slice(0, 5) === w.slice(0, 5)))).length;
      if (n && CATEGORIAS.includes(p.category_id)) {
        puntos[p.category_id] = (puntos[p.category_id] || 0) + n;
        if (!ejemplo[p.category_id]) ejemplo[p.category_id] = p.description;
      }
    }
    const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    if (orden.length && (orden.length === 1 || orden[0][1] > orden[1][1])) {
      return { categoria: orden[0][0], como: `como «${ejemplo[orden[0][0]]}»` };
    }
  }
  const t = plano(descripcion);
  const hit = CLAVES.find(([re]) => re.test(t));
  return { categoria: hit ? hit[1] : 'otros', como: '' };
}

internalRouter.post('/expenses', (req: Request, res: Response) => {
  const userId = usuario(req, res);
  if (!userId) return;
  const b = req.body || {};
  const amount = Math.round(Number(b.amount) * 100) / 100;
  const description = String(b.description || '').trim().slice(0, 200);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? String(b.date) : new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  if (!(amount > 0) || amount > 100000) {
    res.status(400).json({ error: 'Importe no válido.' });
    return;
  }
  if (!description) {
    res.status(400).json({ error: 'Falta la descripción.' });
    return;
  }
  const type = b.type === 'refund' ? 'refund' : 'expense';
  const elegida = CATEGORIAS.includes(b.category_id) ? { categoria: b.category_id, como: '' } : type === 'refund' ? { categoria: 'otros', como: '' } : deducirCategoria(userId, description);
  const method = METODOS.includes(b.payment_method) ? b.payment_method : 'tarjeta';
  const id = `exp-bot-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = Date.now();
  db.prepare(`
    INSERT INTO expenses (id, user_id, amount, date, category_id, description, payment_method, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, amount, date, elegida.categoria, description, method, type, createdAt);
  res.status(201).json({ id, amount, date, category_id: elegida.categoria, como: elegida.como, description, payment_method: method, type, created_at: createdAt });
});

internalRouter.delete('/expenses/:id', (req: Request, res: Response) => {
  const userId = usuario(req, res);
  if (!userId) return;
  const row = db.prepare('SELECT id, created_at FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, userId) as { id: string; created_at: number } | undefined;
  if (!row || !row.id.startsWith('exp-bot-') || Date.now() - row.created_at > 24 * 3600 * 1000) {
    res.status(404).json({ error: 'Solo se pueden deshacer los gastos apuntados por el bot en las últimas 24 horas.' });
    return;
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(row.id);
  res.status(204).end();
});
