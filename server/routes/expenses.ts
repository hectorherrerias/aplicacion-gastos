import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';

export const expensesRouter = Router();

// Protect all expense routes with JWT middleware
expensesRouter.use(authMiddleware);

interface ExpenseRow {
  id: string;
  amount: number;
  date: string;
  category_id: string;
  description: string;
  payment_method: string;
  created_at: number;
}

const mapRowToExpense = (row: ExpenseRow) => ({
  id: row.id,
  amount: Number(row.amount),
  date: row.date,
  categoryId: row.category_id,
  description: row.description,
  paymentMethod: row.payment_method,
  createdAt: row.created_at,
});

// GET /api/expenses - List all expenses
expensesRouter.get('/', (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const rows = db
      .prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC')
      .all() as ExpenseRow[];

    const expenses = rows.map(mapRowToExpense);
    res.json({ expenses });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al consultar gastos en SQLite.' });
  }
});

// POST /api/expenses - Create new expense
expensesRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { amount, date, categoryId, description, paymentMethod } = req.body;

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

    db.prepare(`
      INSERT INTO expenses (id, amount, date, category_id, description, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, parsedAmount, date, categoryId, description.trim(), method, createdAt);

    const createdExpense = {
      id,
      amount: parsedAmount,
      date,
      categoryId,
      description: description.trim(),
      paymentMethod: method,
      createdAt,
    };

    res.status(201).json({ expense: createdExpense });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al guardar el gasto en SQLite.' });
  }
});

// PUT /api/expenses/:id - Update existing expense
expensesRouter.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { amount, date, categoryId, description, paymentMethod } = req.body;

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado.' });
      return;
    }

    const parsedAmount = amount !== undefined ? Number(amount) : existing.amount;
    const newDate = date || existing.date;
    const newCategory = categoryId || existing.category_id;
    const newDesc = description !== undefined ? description.trim() : existing.description;
    const newMethod = paymentMethod || existing.payment_method;

    db.prepare(`
      UPDATE expenses
      SET amount = ?, date = ?, category_id = ?, description = ?, payment_method = ?
      WHERE id = ?
    `).run(parsedAmount, newDate, newCategory, newDesc, newMethod, id);

    const updated = {
      id,
      amount: parsedAmount,
      date: newDate,
      categoryId: newCategory,
      description: newDesc,
      paymentMethod: newMethod,
      createdAt: existing.created_at,
    };

    res.json({ expense: updated });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al actualizar el gasto en SQLite.' });
  }
});

// DELETE /api/expenses/:id - Delete an expense
expensesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow | undefined;
    
    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado.' });
      return;
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    res.json({
      message: 'Gasto eliminado correctamente de SQLite.',
      deletedExpense: mapRowToExpense(existing),
    });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al eliminar el gasto en SQLite.' });
  }
});

// POST /api/expenses/clear - Clear all expenses
expensesRouter.post('/clear', (_req: AuthenticatedRequest, res: Response): void => {
  try {
    db.prepare('DELETE FROM expenses').run();
    res.json({ message: 'Todos los gastos han sido eliminados de SQLite.' });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al vaciar la tabla de gastos.' });
  }
});

// POST /api/expenses/import - Bulk import
expensesRouter.post('/import', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) {
      res.status(400).json({ error: 'El formato de datos debe ser un array de gastos.' });
      return;
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO expenses (id, amount, date, category_id, description, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: any[]) => {
      for (const exp of items) {
        const id = exp.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const amount = Number(exp.amount) || 0;
        const date = exp.date;
        const categoryId = exp.categoryId || exp.category_id || 'otros';
        const description = (exp.description || '').trim();
        const paymentMethod = exp.paymentMethod || exp.payment_method || 'tarjeta';
        const createdAt = exp.createdAt || exp.created_at || Date.now();

        if (amount > 0 && date && description) {
          insertStmt.run(id, amount, date, categoryId, description, paymentMethod, createdAt);
        }
      }
    });

    insertMany(expenses);

    res.json({ message: `${expenses.length} gastos importados en SQLite.` });
  } catch (error) {
    console.error('[Expenses API Error]', error);
    res.status(500).json({ error: 'Error al importar gastos.' });
  }
});
