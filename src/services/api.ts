import type { Expense } from '../types/expense';

const API_BASE_URL = '/api';

const getToken = (): string | null => {
  return localStorage.getItem('gastospro_jwt_token');
};

const authHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      return data as { token: string; user: { id: string; username: string; name: string } };
    },

    me: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sesión no válida');
      return data as { user: { id: string; username: string; name: string } };
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
      return data;
    },
  },

  expenses: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'GET',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar gastos');
      return data.expenses as Expense[];
    },

    create: async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(expense),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar gasto');
      return data.expense as Expense;
    },

    update: async (id: string, updated: Partial<Expense>) => {
      const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar gasto');
      return data.expense as Expense;
    },

    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar gasto');
      return data.deletedExpense as Expense;
    },

    clearAll: async () => {
      const res = await fetch(`${API_BASE_URL}/expenses/clear`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al vaciar gastos');
      return data;
    },

    importMany: async (expenses: Expense[]) => {
      const res = await fetch(`${API_BASE_URL}/expenses/import`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ expenses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar gastos');
      return data;
    },
  },

  settings: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'GET',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar ajustes');
      return data.settings as Record<string, string>;
    },

    set: async (key: string, value: string) => {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar ajuste');
      return data;
    },
  },
};
