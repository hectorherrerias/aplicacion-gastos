import { db } from './db';

// Recurring monthly expenses: each rule creates one movement per month on its day
// (or the last day of shorter months). The movement id is rec-<rule>-<YYYY-MM>, so a
// month is never generated twice, and last_month means a deleted movement is not re-created.

interface RecurringRow {
  id: string;
  user_id: string;
  amount: number;
  category_id: string;
  description: string;
  payment_method: string;
  day_of_month: number;
  active: number;
  last_month: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const nextMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
};
const daysIn = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const previousMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
};

/** Creates any movements due up to today. Returns how many were created. */
export const generateRecurring = (userId?: string, today = new Date()): number => {
  const rules = (userId
    ? db.prepare('SELECT * FROM recurring WHERE active = 1 AND user_id = ?').all(userId)
    : db.prepare('SELECT * FROM recurring WHERE active = 1').all()) as RecurringRow[];
  const current = monthKey(today);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO expenses (id, user_id, amount, date, category_id, description, payment_method, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'expense', ?)
  `);
  const setLast = db.prepare('UPDATE recurring SET last_month = ? WHERE id = ?');
  let created = 0;

  const run = db.transaction(() => {
    for (const r of rules) {
      let key = nextMonth(r.last_month);
      // Catch up month by month (e.g. after the server was off), never into the future
      while (key <= current) {
        const day = Math.min(r.day_of_month, daysIn(key));
        if (key === current && today.getDate() < day) break;
        const res = insert.run(`rec-${r.id}-${key}`, r.user_id, r.amount, `${key}-${pad(day)}`, r.category_id,
          r.description, r.payment_method, Date.now());
        created += res.changes;
        setLast.run(key, r.id);
        key = nextMonth(key);
      }
    }
  });
  run();
  if (created) console.log(`[Recurring] ${created} gastos fijos apuntados`);
  return created;
};

export const startRecurringSchedule = () => {
  generateRecurring();
  setInterval(() => {
    try {
      generateRecurring();
    } catch (err) {
      console.error('[Recurring] Error generating recurring expenses:', err);
    }
  }, 60 * 60 * 1000).unref();
};
