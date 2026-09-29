import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { KpiCards } from './components/kpi/KpiCards';
import { ChartsSection } from './components/charts/ChartsSection';
import { TransactionHistory } from './components/history/TransactionHistory';
import { ExpenseFormModal } from './components/forms/ExpenseFormModal';
import { BudgetModal } from './components/modals/BudgetModal';
import { LoginPage } from './components/auth/LoginPage';
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

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={handleOpenAdd}
        className="mobile-fab animate-slide-up"
        aria-label="Añadir nuevo gasto"
      >
        <span className="fab-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </span>
        <span className="fab-text">Nuevo Gasto</span>
      </button>

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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        gap: '16px',
        color: '#64748b',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#059669',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>Cargando GastosPro...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ExpenseProvider>
      <MainDashboard />
    </ExpenseProvider>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
