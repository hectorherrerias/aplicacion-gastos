export type CategoryId =
  | 'vivienda'
  | 'alimentacion'
  | 'transporte'
  | 'ocio'
  | 'salud'
  | 'educacion'
  | 'otros';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export type PaymentMethod = 'tarjeta' | 'efectivo' | 'bizum' | 'transferencia' | 'otro';

export interface Expense {
  id: string;
  amount: number;
  date: string; // ISO format 'YYYY-MM-DD'
  categoryId: CategoryId;
  description: string;
  paymentMethod?: PaymentMethod;
  createdAt: number;
}

export interface MonthSummary {
  monthIndex: number; // 0-11
  monthName: string;
  year: number;
  total: number;
  count: number;
}

export interface CategoryBreakdown {
  category: CategoryInfo;
  total: number;
  percentage: number;
  count: number;
}

export interface KpiMetrics {
  currentMonthTotal: number;
  previousMonthTotal: number;
  monthDiffPercentage: number | null; // positive = spent more, negative = spent less
  topCategory: CategoryBreakdown | null;
  yearlyTotal: number;
  monthlyAverage: number;
  dailyAverage: number;
  transactionCount: number;
  budgetMonthly: number;
  budgetUsedPercentage: number;
}

export type SortField = 'date' | 'amount' | 'category' | 'description';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  selectedYear: number;
  selectedMonth: number; // 0 for Jan, 11 for Dec, -1 for all year
  selectedCategory: CategoryId | 'all';
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}
