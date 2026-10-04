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

export type TransactionType = 'expense' | 'refund';

export interface Expense {
  id: string;
  amount: number;
  date: string; // ISO format 'YYYY-MM-DD'
  categoryId: CategoryId;
  description: string;
  paymentMethod?: PaymentMethod;
  type?: TransactionType; // 'expense' (default) | 'refund'
  createdAt: number;
}

export interface MonthSummary {
  monthIndex: number; // 0-11
  monthName: string;
  year: number;
  total: number; // Net total (expenses - refunds)
  totalExpenses: number; // Gross expenses
  totalRefunds: number; // Refunds received
  totalNet: number; // expenses - refunds
  count: number;
  expensesCount: number;
  refundsCount: number;
}

export interface CategoryBreakdown {
  category: CategoryInfo;
  total: number; // Net total
  totalExpenses: number;
  totalRefunds: number;
  percentage: number;
  count: number;
}

export interface KpiMetrics {
  currentMonthTotal: number; // Net monthly
  currentMonthGrossExpenses: number;
  currentMonthRefunds: number;
  previousMonthTotal: number;
  previousMonthGrossExpenses: number;
  previousMonthRefunds: number;
  monthDiffPercentage: number | null; // positive = spent more net, negative = spent less net
  topCategory: CategoryBreakdown | null;
  yearlyTotal: number; // Net yearly
  yearlyGrossExpenses: number;
  yearlyRefunds: number;
  monthlyAverage: number;
  dailyAverage: number;
  transactionCount: number;
  expensesCount: number;
  refundsCount: number;
  budgetMonthly: number;
  budgetUsedPercentage: number;
}

export type SortField = 'date' | 'amount' | 'category' | 'description';
export type SortOrder = 'asc' | 'desc';
export type TransactionTypeFilter = 'all' | 'expense' | 'refund';

export interface FilterState {
  selectedYear: number;
  selectedMonth: number; // 0 for Jan, 11 for Dec, -1 for all year
  selectedCategory: CategoryId | 'all';
  selectedType: TransactionTypeFilter;
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}
