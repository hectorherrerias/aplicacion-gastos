import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

const STORAGE_KEY = 'gastospro_expenses_data_v1';
const BUDGET_STORAGE_KEY = 'gastospro_budget_v1';
const CURRENCY_STORAGE_KEY = 'gastospro_currency_v1';

interface ExpenseContextType {
  expenses: Expense[];
  filteredExpenses: Expense[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  editExpense: (id: string, updated: Partial<Expense>) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  resetToSampleData: () => void;
  clearAllExpenses: () => void;
  importExpenses: (imported: Expense[]) => void;
  budgetMonthly: number;
  setBudgetMonthly: (amount: number) => void;
  currency: string;
  setCurrency: (c: string) => void;
  kpiMetrics: KpiMetrics;
  categoryBreakdown: CategoryBreakdown[];
  monthlySummary: MonthSummary[];
  availableYears: number[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // 1. Load initial expenses from localStorage or default to empty list
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading expenses from localStorage', e);
    }
    return [];
  });

  // 2. Budget monthly goal
  const [budgetMonthly, setBudgetMonthlyState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
      if (saved) return Number(saved) || 2000;
    } catch (e) {
      console.error(e);
    }
    return 2000;
  });

  // 3. Currency
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'EUR';
    } catch {
      return 'EUR';
    }
  });

  // 4. Global Filter State
  const [filters, setFilters] = useState<FilterState>({
    selectedYear: currentYear,
    selectedMonth: currentMonth, // 0-11, or -1 for all year
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Save to localStorage when expenses change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [expenses]);

  const setBudgetMonthly = (amount: number) => {
    setBudgetMonthlyState(amount);
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, amount.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    } catch (e) {
      console.error(e);
    }
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const editExpense = (id: string, updated: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updated } : exp))
    );
  };

  const deleteExpense = (id: string): Expense | undefined => {
    const target = expenses.find((e) => e.id === id);
    if (target) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
    return target;
  };

  const restoreExpense = (expense: Expense) => {
    setExpenses((prev) => {
      // Avoid duplicate
      if (prev.some((e) => e.id === expense.id)) return prev;
      return [expense, ...prev];
    });
  };

  const resetToSampleData = () => {
    const samples = generateSampleExpenses();
    setExpenses(samples);
    setFilters((prev) => ({
      ...prev,
      selectedYear: currentYear,
      selectedMonth: currentMonth,
      selectedCategory: 'all',
      searchQuery: '',
    }));
  };

  const clearAllExpenses = () => {
    setExpenses([]);
  };

  const importExpenses = (imported: Expense[]) => {
    if (Array.isArray(imported)) {
      setExpenses(imported);
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

  // Derived: Filtered & Sorted expenses for the history list/table
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const [yearStr, monthStr] = exp.date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10) - 1; // 0-11

      // Year filter
      if (expYear !== filters.selectedYear) return false;

      // Month filter (if not -1 for all year)
      if (filters.selectedMonth !== -1 && expMonth !== filters.selectedMonth) {
        return false;
      }

      // Category filter
      if (filters.selectedCategory !== 'all' && exp.categoryId !== filters.selectedCategory) {
        return false;
      }

      // Search Query filter
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const descMatch = exp.description?.toLowerCase().includes(query);
        const catInfo = CATEGORY_MAP[exp.categoryId];
        const catMatch = catInfo?.name.toLowerCase().includes(query);
        const amountMatch = exp.amount.toString().includes(query);
        if (!descMatch && !catMatch && !amountMatch) {
          return false;
        }
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

  // Derived: Monthly Summary for 12 months of the selected year (for Bar/Line Chart)
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

  // Derived: Category Breakdown for selected month or year (for Donut Chart & top category)
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

    // Sort descending by total amount
    return breakdown.sort((a, b) => b.total - a.total);
  }, [expenses, filters.selectedYear, filters.selectedMonth]);

  // Derived: KPI Metrics
  const kpiMetrics = useMemo<KpiMetrics>(() => {
    const selYear = filters.selectedYear;
    const selMonth = filters.selectedMonth;

    // 1. Current selection total
    let currentPeriodExpenses: Expense[] = [];
    let prevPeriodExpenses: Expense[] = [];

    if (selMonth === -1) {
      // Entire Year
      currentPeriodExpenses = expenses.filter((e) => {
        const [y] = e.date.split('-');
        return parseInt(y, 10) === selYear;
      });
      prevPeriodExpenses = expenses.filter((e) => {
        const [y] = e.date.split('-');
        return parseInt(y, 10) === selYear - 1;
      });
    } else {
      // Specific Month
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

    // Yearly total for selectedYear
    const yearlyExpenses = expenses.filter((e) => {
      const [y] = e.date.split('-');
      return parseInt(y, 10) === selYear;
    });
    const yearlyTotal = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Active days count for daily average
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
