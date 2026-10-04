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
    selectedType: 'all',
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Load expenses and settings from SQLite backend when authenticated
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch expenses & refunds
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
      console.error('Error creating expense/refund in SQLite:', error);
      // Fallback local creation
      const localExp: Expense = {
        ...expenseData,
        type: expenseData.type || 'expense',
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
      console.error('Error updating expense/refund in SQLite:', error);
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
      console.error('Error deleting movement in SQLite:', error);
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
        type: expense.type || 'expense',
      });
      setExpenses((prev) => [expense, ...prev]);
    } catch (error) {
      console.error('Error restoring movement in SQLite:', error);
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
      selectedType: 'all',
      searchQuery: '',
    }));
  };

  const clearAllExpenses = async () => {
    try {
      await api.expenses.clearAll();
    } catch (error) {
      console.error('Error clearing movements in SQLite:', error);
    }
    setExpenses([]);
  };

  const importExpenses = async (imported: Expense[]) => {
    if (Array.isArray(imported)) {
      try {
        await api.expenses.importMany(imported);
        setExpenses(imported);
      } catch (error) {
        console.error('Error importing movements:', error);
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

  // Derived: Filtered & Sorted movements
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1;

      if (expYear !== filters.selectedYear) return false;
      if (filters.selectedMonth !== -1 && expMonth !== filters.selectedMonth) return false;
      if (filters.selectedCategory !== 'all' && exp.categoryId !== filters.selectedCategory) return false;

      // Filter by type: 'all' | 'expense' | 'refund'
      const expType = exp.type === 'refund' ? 'refund' : 'expense';
      if (filters.selectedType !== 'all' && expType !== filters.selectedType) return false;

      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const descMatch = exp.description?.toLowerCase().includes(query);
        const catInfo = CATEGORY_MAP[exp.categoryId];
        const catMatch = catInfo?.name.toLowerCase().includes(query);
        const amountMatch = exp.amount.toString().includes(query);
        const typeMatch = (expType === 'refund' ? 'reembolso devolucion devolución' : 'gasto').includes(query);
        if (!descMatch && !catMatch && !amountMatch && !typeMatch) return false;
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

  // Derived: Monthly Summary for 12 months (Gross expenses, Refunds, Net)
  const monthlySummary = useMemo<MonthSummary[]>(() => {
    const summaries: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: MONTH_NAMES_ES[i],
      year: filters.selectedYear,
      total: 0,
      totalExpenses: 0,
      totalRefunds: 0,
      totalNet: 0,
      count: 0,
      expensesCount: 0,
      refundsCount: 0,
    }));

    expenses.forEach((exp) => {
      if (!exp.date) return;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1;

      if (expYear === filters.selectedYear && expMonth >= 0 && expMonth < 12) {
        const isRefund = exp.type === 'refund';
        if (isRefund) {
          summaries[expMonth].totalRefunds += exp.amount;
          summaries[expMonth].refundsCount += 1;
        } else {
          summaries[expMonth].totalExpenses += exp.amount;
          summaries[expMonth].expensesCount += 1;
        }
        summaries[expMonth].count += 1;
      }
    });

    summaries.forEach((s) => {
      s.totalNet = Math.max(0, s.totalExpenses - s.totalRefunds);
      s.total = s.totalNet;
    });

    return summaries;
  }, [expenses, filters.selectedYear]);

  // Derived: Category Breakdown (Net spent per category)
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

    const categoryStats: Record<CategoryId, { totalExpenses: number; totalRefunds: number; count: number }> = {
      vivienda: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      alimentacion: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      transporte: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      ocio: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      salud: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      educacion: { totalExpenses: 0, totalRefunds: 0, count: 0 },
      otros: { totalExpenses: 0, totalRefunds: 0, count: 0 },
    };

    targetExpenses.forEach((exp) => {
      if (categoryStats[exp.categoryId]) {
        if (exp.type === 'refund') {
          categoryStats[exp.categoryId].totalRefunds += exp.amount;
        } else {
          categoryStats[exp.categoryId].totalExpenses += exp.amount;
        }
        categoryStats[exp.categoryId].count += 1;
      }
    });

    const overallNetSpent = Object.values(categoryStats).reduce(
      (sum, s) => sum + Math.max(0, s.totalExpenses - s.totalRefunds),
      0
    );

    const breakdown: CategoryBreakdown[] = CATEGORIES.map((cat) => {
      const stats = categoryStats[cat.id];
      const netTotal = Math.max(0, stats.totalExpenses - stats.totalRefunds);
      const percentage = overallNetSpent > 0 ? (netTotal / overallNetSpent) * 100 : 0;
      return {
        category: cat,
        total: netTotal,
        totalExpenses: stats.totalExpenses,
        totalRefunds: stats.totalRefunds,
        percentage: Number(percentage.toFixed(1)),
        count: stats.count,
      };
    }).filter((item) => item.totalExpenses > 0 || item.totalRefunds > 0 || filters.selectedMonth === -1);

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

    // Current period metrics
    const currentMonthGrossExpenses = currentPeriodExpenses
      .filter((e) => e.type !== 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const currentMonthRefunds = currentPeriodExpenses
      .filter((e) => e.type === 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const currentMonthTotal = Math.max(0, currentMonthGrossExpenses - currentMonthRefunds);

    // Previous period metrics
    const previousMonthGrossExpenses = prevPeriodExpenses
      .filter((e) => e.type !== 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const previousMonthRefunds = prevPeriodExpenses
      .filter((e) => e.type === 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const previousMonthTotal = Math.max(0, previousMonthGrossExpenses - previousMonthRefunds);

    let monthDiffPercentage: number | null = null;
    if (previousMonthTotal > 0) {
      monthDiffPercentage = Number(
        (((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1)
      );
    }

    // Yearly calculations
    const yearlyExpenses = expenses.filter((e) => {
      const [y] = e.date.split('-');
      return parseInt(y, 10) === selYear;
    });
    const yearlyGrossExpenses = yearlyExpenses
      .filter((e) => e.type !== 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const yearlyRefunds = yearlyExpenses
      .filter((e) => e.type === 'refund')
      .reduce((sum, e) => sum + e.amount, 0);
    const yearlyTotal = Math.max(0, yearlyGrossExpenses - yearlyRefunds);

    const daysInMonth = selMonth === -1 ? 365 : new Date(selYear, selMonth + 1, 0).getDate();
    const dailyAverage = daysInMonth > 0 ? currentMonthTotal / daysInMonth : 0;
    const monthlyAverage = yearlyTotal / 12;
    const topCat = categoryBreakdown.length > 0 && categoryBreakdown[0].total > 0 ? categoryBreakdown[0] : null;
    const budgetUsedPercentage = budgetMonthly > 0 ? Math.min(100, (currentMonthTotal / budgetMonthly) * 100) : 0;

    const expensesCount = currentPeriodExpenses.filter((e) => e.type !== 'refund').length;
    const refundsCount = currentPeriodExpenses.filter((e) => e.type === 'refund').length;

    return {
      currentMonthTotal,
      currentMonthGrossExpenses,
      currentMonthRefunds,
      previousMonthTotal,
      previousMonthGrossExpenses,
      previousMonthRefunds,
      monthDiffPercentage,
      topCategory: topCat,
      yearlyTotal,
      yearlyGrossExpenses,
      yearlyRefunds,
      monthlyAverage,
      dailyAverage,
      transactionCount: currentPeriodExpenses.length,
      expensesCount,
      refundsCount,
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
