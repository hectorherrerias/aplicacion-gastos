import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';

export const expensesRouter = Router();

// Protect all expense routes with JWT middleware
expensesRouter.use(authMiddleware);

interface ExpenseRow {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  category_id: string;
  description: string;
  payment_method: string;
  type?: string;
  created_at: number;
}

const mapRowToExpense = (row: ExpenseRow) => ({
  id: row.id,
  amount: Number(row.amount),
  date: row.date,
  categoryId: row.category_id,
  description: row.description,
  paymentMethod: row.payment_method,
  type: (row.type === 'refund' ? 'refund' : 'expense') as 'expense' | 'refund',
  createdAt: row.created_at,
});

// GET /api/expenses - List only the logged-in user's expenses & refunds
expensesRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const rows = db
      .prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC')
      .all(userId) as ExpenseRow[];

    const expenses = rows.map(mapRowToExpense);
    res.json({ expenses });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al consultar movimientos en SQLite.' });
  }
});

// POST /api/expenses - Create new expense or refund for the logged-in user
expensesRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { amount, date, categoryId, description, paymentMethod, type } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'El importe debe ser un número positivo.' });
      return;
    }

    if (!date || !categoryId || !description) {
      res.status(400).json({ error: 'Faltan campos obligatorios (fecha, categoría o descripción).' });
      return;
    }

    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = Date.now();
    const method = paymentMethod || 'tarjeta';
    const movementType = type === 'refund' ? 'refund' : 'expense';

    db.prepare(`
      INSERT INTO expenses (id, user_id, amount, date, category_id, description, payment_method, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, parsedAmount, date, categoryId, description.trim(), method, movementType, createdAt);

    const createdExpense = {
      id,
      amount: parsedAmount,
      date,
      categoryId,
      description: description.trim(),
      paymentMethod: method,
      type: movementType as 'expense' | 'refund',
      createdAt,
    };

    res.status(201).json({ expense: createdExpense });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al guardar el movimiento en SQLite.' });
  }
});

// PUT /api/expenses/:id - Update existing expense or refund of the logged-in user
expensesRouter.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { id } = req.params;
    const { amount, date, categoryId, description, paymentMethod, type } = req.body;

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
      .get(id, userId) as ExpenseRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Movimiento no encontrado o no pertenece a tu cuenta.' });
      return;
    }

    const parsedAmount = amount !== undefined ? Number(amount) : existing.amount;
    const newDate = date || existing.date;
    const newCategory = categoryId || existing.category_id;
    const newDesc = description !== undefined ? description.trim() : existing.description;
    const newMethod = paymentMethod || existing.payment_method;
    const newType = type !== undefined ? (type === 'refund' ? 'refund' : 'expense') : (existing.type || 'expense');

    db.prepare(`
      UPDATE expenses
      SET amount = ?, date = ?, category_id = ?, description = ?, payment_method = ?, type = ?
      WHERE id = ? AND user_id = ?
    `).run(parsedAmount, newDate, newCategory, newDesc, newMethod, newType, id, userId);

    const updated = {
      id,
      amount: parsedAmount,
      date: newDate,
      categoryId: newCategory,
      description: newDesc,
      paymentMethod: newMethod,
      type: newType as 'expense' | 'refund',
      createdAt: existing.created_at,
    };

    res.json({ expense: updated });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al actualizar el movimiento en SQLite.' });
  }
});

// DELETE /api/expenses/:id - Delete an expense or refund belonging to the logged-in user
expensesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { id } = req.params;
    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?')
      .get(id, userId) as ExpenseRow | undefined;
    
    if (!existing) {
      res.status(404).json({ error: 'Movimiento no encontrado o no pertenece a tu cuenta.' });
      return;
    }

    db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId);

    res.json({
      message: 'Movimiento eliminado correctamente de SQLite.',
      deletedExpense: mapRowToExpense(existing),
    });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al eliminar el movimiento en SQLite.' });
  }
});

// POST /api/expenses/clear - Clear all expenses of the logged-in user
expensesRouter.post('/clear', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    db.prepare('DELETE FROM expenses WHERE user_id = ?').run(userId);
    res.json({ message: 'Todos tus movimientos han sido eliminados de SQLite.' });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al vaciar la tabla de movimientos.' });
  }
});

// POST /api/expenses/import - Bulk import for the logged-in user
expensesRouter.post('/import', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { expenses } = req.body;
    if (!Array.isArray(expenses)) {
      res.status(400).json({ error: 'El formato de datos debe ser un array de gastos o reembolsos.' });
      return;
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO expenses (id, user_id, amount, date, category_id, description, payment_method, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: any[]) => {
      for (const exp of items) {
        const id = exp.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const amount = Number(exp.amount) || 0;
        const date = exp.date;
        const categoryId = exp.categoryId || exp.category_id || 'otros';
        const description = (exp.description || '').trim();
        const paymentMethod = exp.paymentMethod || exp.payment_method || 'tarjeta';
        const type = exp.type === 'refund' ? 'refund' : 'expense';
        const createdAt = exp.createdAt || exp.created_at || Date.now();

        if (amount > 0 && date && description) {
          insertStmt.run(id, userId, amount, date, categoryId, description, paymentMethod, type, createdAt);
        }
      }
    });

    insertMany(expenses);

    res.json({ message: `${expenses.length} movimientos importados en tu cuenta de SQLite.` });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al importar movimientos.' });
  }
});
