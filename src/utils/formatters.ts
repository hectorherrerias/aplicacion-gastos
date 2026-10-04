import type { Expense } from '../types/expense';
import { CATEGORY_MAP } from '../constants/categories';

export const formatCurrency = (
  amount: number,
  currency: string = 'EUR',
  locale: string = 'es-ES'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (
  num: number,
  decimals: number = 2,
  locale: string = 'es-ES'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateRelative = (dateStr: string): string => {
  if (!dateStr) return '';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return 'Hoy';
  } else if (dateStr === yesterdayStr) {
    return 'Ayer';
  } else {
    return formatDateShort(dateStr);
  }
};

export const formatDateForInput = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const downloadCSV = (expenses: Expense[], filename: string = 'movimientos_gastospro.csv') => {
  // CSV header with Excel BOM \uFEFF for proper UTF-8 accents
  const headers = ['ID', 'Tipo', 'Fecha', 'Categoría', 'Descripción', 'Método de Pago', 'Importe (€)'];
  
  const rows = expenses.map((exp) => [
    `"${exp.id}"`,
    `"${exp.type === 'refund' ? 'Reembolso / Devolución' : 'Gasto'}"`,
    `"${exp.date}"`,
    `"${CATEGORY_MAP[exp.categoryId]?.name || exp.categoryId}"`,
    `"${exp.description.replace(/"/g, '""')}"`,
    `"${exp.paymentMethod || 'tarjeta'}"`,
    `${exp.type === 'refund' ? '+' : '-'}${exp.amount.toFixed(2).replace('.', ',')}`, // European format with sign
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadJSON = (expenses: Expense[], filename: string = 'copia_seguridad_gastos.json') => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(expenses, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
