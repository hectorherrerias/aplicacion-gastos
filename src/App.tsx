import React, { useState } from 'react';
import { ExpenseProvider } from './context/ExpenseContext';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { KpiCards } from './components/kpi/KpiCards';
import { ChartsSection } from './components/charts/ChartsSection';
import { TransactionHistory } from './components/history/TransactionHistory';
import { ExpenseFormModal } from './components/forms/ExpenseFormModal';
import { BudgetModal } from './components/modals/BudgetModal';
import type { Expense } from './types/expense';
import './App.css';

const MainDashboard: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const handleOpenAdd = () => {
    setExpenseToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setExpenseToEdit(null);
  };

  return (
    <div className="app-container">
      {/* Top Sticky Header */}
      <Header
        onOpenAddModal={handleOpenAdd}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* 1. KPI Summary Cards */}
        <section aria-label="Resumen de métricas y KPIs">
          <KpiCards onOpenBudgetModal={() => setIsBudgetModalOpen(true)} />
        </section>

        {/* 2. Visual Analytics & Charts */}
        <section aria-label="Visualización gráfica de gastos">
          <ChartsSection />
        </section>

        {/* 3. Transaction History Table */}
        <section aria-label="Historial de movimientos y transacciones">
          <TransactionHistory
            onEditExpense={handleEditExpense}
            onOpenAddModal={handleOpenAdd}
          />
        </section>
      </main>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        expenseToEdit={expenseToEdit}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <ExpenseProvider>
        <MainDashboard />
      </ExpenseProvider>
    </ToastProvider>
  );
}
