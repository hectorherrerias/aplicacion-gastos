import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Expense,
  FilterState,
  KpiMetrics,
  CategoryBreakdown,
  MonthSummary,
  CategoryId,
} from '../types/expense';
import { CATEGORIES, CATEGORY_MAP, MONTH_NAMES_ES } from '../constants/categories';
import { generateSampleExpenses } from '../constants/initialData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  filteredExpenses: Expense[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  editExpense: (id: string, updated: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<Expense | undefined>;
  restoreExpense: (expense: Expense) => Promise<void>;
  resetToSampleData: () => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  importExpenses: (imported: Expense[]) => Promise<void>;
  budgetMonthly: number;
  setBudgetMonthly: (amount: number) => Promise<void>;
  currency: string;
  setCurrency: (c: string) => Promise<void>;
  kpiMetrics: KpiMetrics;
  categoryBreakdown: CategoryBreakdown[];
  monthlySummary: MonthSummary[];
  availableYears: number[];
  isLoadingData: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetMonthly, setBudgetMonthlyState] = useState<number>(2000);
  const [currency, setCurrencyState] = useState<string>('EUR');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Global Filter State
  const [filters, setFilters] = useState<FilterState>({
    selectedYear: currentYear,
    selectedMonth: currentMonth,
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Load expenses and settings from SQLite backend when authenticated
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch expenses
      const fetchedExpenses = await api.expenses.getAll();
      setExpenses(fetchedExpenses || []);

      // 2. Fetch settings
      const settings = await api.settings.getAll();
      if (settings.budget_monthly) {
        setBudgetMonthlyState(parseFloat(settings.budget_monthly) || 2000);
      }
      if (settings.currency) {
        setCurrencyState(settings.currency);
      }
    } catch (error) {
      console.error('[ExpenseContext] Error loading data from SQLite backend:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setExpenses([]);
    }
  }, [isAuthenticated, loadData]);

  const setBudgetMonthly = async (amount: number) => {
    setBudgetMonthlyState(amount);
    try {
      await api.settings.set('budget_monthly', amount.toString());
    } catch (e) {
      console.error('Failed to save budget in SQLite', e);
    }
  };

  const setCurrency = async (c: string) => {
    setCurrencyState(c);
    try {
      await api.settings.set('currency', c);
    } catch (e) {
      console.error('Failed to save currency in SQLite', e);
    }
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    try {
      const created = await api.expenses.create(expenseData);
      setExpenses((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('Error creating expense in SQLite:', error);
      // Fallback local creation
      const localExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      setExpenses((prev) => [localExp, ...prev]);
      return localExp;
    }
  };

  const editExpense = async (id: string, updated: Partial<Expense>) => {
    try {
      const saved = await api.expenses.update(id, updated);
      setExpenses((prev) => prev.map((exp) => (exp.id === id ? saved : exp)));
    } catch (error) {
      console.error('Error updating expense in SQLite:', error);
      setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...updated } : exp)));
    }
  };

  const deleteExpense = async (id: string): Promise<Expense | undefined> => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return undefined;

    try {
      await api.expenses.delete(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      return target;
    } catch (error) {
      console.error('Error deleting expense in SQLite:', error);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      return target;
    }
  };

  const restoreExpense = async (expense: Expense) => {
    try {
      await api.expenses.create({
        amount: expense.amount,
        date: expense.date,
        categoryId: expense.categoryId,
        description: expense.description,
        paymentMethod: expense.paymentMethod,
      });
      setExpenses((prev) => [expense, ...prev]);
    } catch (error) {
      console.error('Error restoring expense in SQLite:', error);
      setExpenses((prev) => [expense, ...prev]);
    }
  };

  const resetToSampleData = async () => {
    const samples = generateSampleExpenses();
    try {
      await api.expenses.clearAll();
      await api.expenses.importMany(samples);
      setExpenses(samples);
    } catch (error) {
      console.error('Error loading sample data:', error);
      setExpenses(samples);
    }

    setFilters((prev) => ({
      ...prev,
      selectedYear: currentYear,
      selectedMonth: currentMonth,
      selectedCategory: 'all',
      searchQuery: '',
    }));
  };

  const clearAllExpenses = async () => {
    try {
      await api.expenses.clearAll();
    } catch (error) {
      console.error('Error clearing expenses in SQLite:', error);
    }
    setExpenses([]);
  };

  const importExpenses = async (imported: Expense[]) => {
    if (Array.isArray(imported)) {
      try {
        await api.expenses.importMany(imported);
        setExpenses(imported);
      } catch (error) {
        console.error('Error importing expenses:', error);
        setExpenses(imported);
      }
    }
  };

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear]);
    expenses.forEach((e) => {
      if (e.date) {
        const y = parseInt(e.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [expenses, currentYear]);

  // Derived: Filtered & Sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1;

      if (expYear !== filters.selectedYear) return false;
      if (filters.selectedMonth !== -1 && expMonth !== filters.selectedMonth) return false;
      if (filters.selectedCategory !== 'all' && exp.categoryId !== filters.selectedCategory) return false;

      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const descMatch = exp.description?.toLowerCase().includes(query);
        const catInfo = CATEGORY_MAP[exp.categoryId];
        const catMatch = catInfo?.name.toLowerCase().includes(query);
        const amountMatch = exp.amount.toString().includes(query);
        if (!descMatch && !catMatch && !amountMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'date') {
        comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (comparison === 0) comparison = b.createdAt - a.createdAt;
      } else if (filters.sortBy === 'amount') {
        comparison = b.amount - a.amount;
      } else if (filters.sortBy === 'category') {
        const catA = CATEGORY_MAP[a.categoryId]?.name || '';
        const catB = CATEGORY_MAP[b.categoryId]?.name || '';
        comparison = catA.localeCompare(catB);
      } else if (filters.sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      }

      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [expenses, filters]);

  // Derived: Monthly Summary for 12 months
  const monthlySummary = useMemo<MonthSummary[]>(() => {
    const summaries: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: MONTH_NAMES_ES[i],
      year: filters.selectedYear,
      total: 0,
      count: 0,
    }));

    expenses.forEach((exp) => {
      if (!exp.date) return;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1;

      if (expYear === filters.selectedYear && expMonth >= 0 && expMonth < 12) {
        summaries[expMonth].total += exp.amount;
        summaries[expMonth].count += 1;
      }
    });

    return summaries;
  }, [expenses, filters.selectedYear]);

  // Derived: Category Breakdown
  const categoryBreakdown = useMemo<CategoryBreakdown[]>(() => {
    const targetExpenses = expenses.filter((exp) => {
      if (!exp.date) return false;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1;

      if (expYear !== filters.selectedYear) return false;
      if (filters.selectedMonth !== -1 && expMonth !== filters.selectedMonth) return false;
      return true;
    });

    const totalSpent = targetExpenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryTotals: Record<CategoryId, { total: number; count: number }> = {
      vivienda: { total: 0, count: 0 },
      alimentacion: { total: 0, count: 0 },
      transporte: { total: 0, count: 0 },
      ocio: { total: 0, count: 0 },
      salud: { total: 0, count: 0 },
      educacion: { total: 0, count: 0 },
      otros: { total: 0, count: 0 },
    };

    targetExpenses.forEach((exp) => {
      if (categoryTotals[exp.categoryId]) {
        categoryTotals[exp.categoryId].total += exp.amount;
        categoryTotals[exp.categoryId].count += 1;
      }
    });

    const breakdown: CategoryBreakdown[] = CATEGORIES.map((cat) => {
      const stats = categoryTotals[cat.id];
      const percentage = totalSpent > 0 ? (stats.total / totalSpent) * 100 : 0;
      return {
        category: cat,
        total: stats.total,
        percentage: Number(percentage.toFixed(1)),
        count: stats.count,
      };
    }).filter((item) => item.total > 0 || filters.selectedMonth === -1);

    return breakdown.sort((a, b) => b.total - a.total);
  }, [expenses, filters.selectedYear, filters.selectedMonth]);

  // Derived: KPI Metrics
  const kpiMetrics = useMemo<KpiMetrics>(() => {
    const selYear = filters.selectedYear;
    const selMonth = filters.selectedMonth;

    let currentPeriodExpenses: Expense[] = [];
    let prevPeriodExpenses: Expense[] = [];

    if (selMonth === -1) {
      currentPeriodExpenses = expenses.filter((e) => {
        const [y] = e.date.split('-');
        return parseInt(y, 10) === selYear;
      });
      prevPeriodExpenses = expenses.filter((e) => {
        const [y] = e.date.split('-');
        return parseInt(y, 10) === selYear - 1;
      });
    } else {
      currentPeriodExpenses = expenses.filter((e) => {
        const [y, m] = e.date.split('-');
        return parseInt(y, 10) === selYear && parseInt(m, 10) - 1 === selMonth;
      });

      const prevMonth = selMonth === 0 ? 11 : selMonth - 1;
      const prevYear = selMonth === 0 ? selYear - 1 : selYear;
      prevPeriodExpenses = expenses.filter((e) => {
        const [y, m] = e.date.split('-');
        return parseInt(y, 10) === prevYear && parseInt(m, 10) - 1 === prevMonth;
      });
    }

    const currentMonthTotal = currentPeriodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const previousMonthTotal = prevPeriodExpenses.reduce((sum, e) => sum + e.amount, 0);

    let monthDiffPercentage: number | null = null;
    if (previousMonthTotal > 0) {
      monthDiffPercentage = Number(
        (((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1)
      );
    }

    const yearlyExpenses = expenses.filter((e) => {
      const [y] = e.date.split('-');
      return parseInt(y, 10) === selYear;
    });
    const yearlyTotal = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const daysInMonth = selMonth === -1 ? 365 : new Date(selYear, selMonth + 1, 0).getDate();
    const dailyAverage = daysInMonth > 0 ? currentMonthTotal / daysInMonth : 0;
    const monthlyAverage = yearlyTotal / 12;
    const topCat = categoryBreakdown.length > 0 && categoryBreakdown[0].total > 0 ? categoryBreakdown[0] : null;
    const budgetUsedPercentage = budgetMonthly > 0 ? Math.min(100, (currentMonthTotal / budgetMonthly) * 100) : 0;

    return {
      currentMonthTotal,
      previousMonthTotal,
      monthDiffPercentage,
      topCategory: topCat,
      yearlyTotal,
      monthlyAverage,
      dailyAverage,
      transactionCount: currentPeriodExpenses.length,
      budgetMonthly,
      budgetUsedPercentage,
    };
  }, [expenses, filters.selectedYear, filters.selectedMonth, categoryBreakdown, budgetMonthly]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        filteredExpenses,
        filters,
        setFilters,
        updateFilter,
        addExpense,
        editExpense,
        deleteExpense,
        restoreExpense,
        resetToSampleData,
        clearAllExpenses,
        importExpenses,
        budgetMonthly,
        setBudgetMonthly,
        currency,
        setCurrency,
        kpiMetrics,
        categoryBreakdown,
        monthlySummary,
        availableYears,
        isLoadingData,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenseContext = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider');
  }
  return context;
};
