import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Database,
  Sliders,
  Check,
  ChevronDown,
  Trash2,
  LogOut,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MONTH_NAMES_ES } from '../../constants/categories';
import { downloadCSV, downloadJSON } from '../../utils/formatters';
import { useToast } from '../ui/Toast';

interface HeaderProps {
  onOpenAddModal: (defaultType?: 'expense' | 'refund') => void;
  onOpenBudgetModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddModal, onOpenBudgetModal }) => {
  const {
    filters,
    updateFilter,
    availableYears,
    expenses,
    resetToSampleData,
    clearAllExpenses,
    currency,
    setCurrency,
  } = useExpenseContext();

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { showToast } = useToast();
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date();
  const currentActualYear = currentDate.getFullYear();
  const currentActualMonth = currentDate.getMonth();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (filters.selectedMonth === -1) {
      updateFilter('selectedMonth', 11);
      return;
    }
    if (filters.selectedMonth === 0) {
      updateFilter('selectedYear', filters.selectedYear - 1);
      updateFilter('selectedMonth', 11);
    } else {
      updateFilter('selectedMonth', filters.selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (filters.selectedMonth === -1) {
      updateFilter('selectedMonth', 0);
      return;
    }
    if (filters.selectedMonth === 11) {
      updateFilter('selectedYear', filters.selectedYear + 1);
      updateFilter('selectedMonth', 0);
    } else {
      updateFilter('selectedMonth', filters.selectedMonth + 1);
    }
  };

  const handleSetCurrentMonth = () => {
    updateFilter('selectedYear', currentActualYear);
    updateFilter('selectedMonth', currentActualMonth);
    showToast({
      title: 'Filtro actualizado',
      message: `Mostrando ${MONTH_NAMES_ES[currentActualMonth]} ${currentActualYear}`,
      type: 'info',
    });
  };

  const handleExportCSV = () => {
    downloadCSV(expenses, `movimientos_${filters.selectedYear}_${filters.selectedMonth !== -1 ? MONTH_NAMES_ES[filters.selectedMonth] : 'anual'}.csv`);
    showToast({
      title: 'Archivo CSV descargado',
      message: 'Incluye gastos y reembolsos con compatibilidad total con Excel.',
      type: 'success',
    });
    setShowOptionsDropdown(false);
  };

  const handleExportJSON = () => {
    downloadJSON(expenses);
    showToast({
      title: 'Copia de seguridad guardada',
      message: `${expenses.length} registros exportados con éxito.`,
      type: 'success',
    });
    setShowOptionsDropdown(false);
  };

  const handleResetDemo = () => {
    resetToSampleData();
    showToast({
      title: 'Datos de muestra cargados',
      message: 'Se han cargado gastos y reembolsos de demostración para el año.',
      type: 'info',
    });
    setShowOptionsDropdown(false);
  };

  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar todos los gastos y reembolsos?')) {
      clearAllExpenses();
      showToast({
        title: 'Movimientos eliminados',
        message: 'La aplicación ha quedado totalmente vacía.',
        type: 'info',
      });
      setShowOptionsDropdown(false);
    }
  };

  const isCurrentMonthActive =
    filters.selectedYear === currentActualYear && filters.selectedMonth === currentActualMonth;

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* Brand Logo & Name */}
        <div className="header-brand">
          <div className="brand-icon-wrapper">
            <Wallet className="brand-icon" size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="brand-title">GastosPro</h1>
              <span className="brand-badge">Fintech</span>
            </div>
            <p className="brand-subtitle">Control & Análisis de Gastos y Reembolsos</p>
          </div>
        </div>

        {/* Global Month & Year Controls */}
        <div className="filter-bar">
          <div className="date-selector-group">
            <button
              onClick={handlePrevMonth}
              className="icon-nav-btn"
              title="Mes anterior"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Month Dropdown */}
            <div className="select-wrapper">
              <Calendar size={16} className="select-icon" />
              <select
                value={filters.selectedMonth}
                onChange={(e) => updateFilter('selectedMonth', parseInt(e.target.value, 10))}
                className="custom-select month-select"
              >
                <option value={-1}>📅 Todo el año</option>
                {MONTH_NAMES_ES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="select-wrapper">
              <select
                value={filters.selectedYear}
                onChange={(e) => updateFilter('selectedYear', parseInt(e.target.value, 10))}
                className="custom-select year-select"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="icon-nav-btn"
              title="Mes siguiente"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick "Mes actual" Pill Button */}
          {!isCurrentMonthActive && (
            <button onClick={handleSetCurrentMonth} className="btn-today-pill">
              Mes actual
            </button>
          )}
        </div>

        {/* Right CTA Actions */}
        <div className="header-actions">
          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="btn-secondary btn-icon-only theme-toggle-btn"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
          </button>

          {/* Options Dropdown Menu */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              className="btn-secondary btn-icon-only"
              title="Opciones y ajustes"
              aria-label="Opciones"
            >
              <Sliders size={18} />
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>

            {showOptionsDropdown && (
              <div className="dropdown-wrapper">
                <div className="dropdown-backdrop" onClick={() => setShowOptionsDropdown(false)} />
                <div className="dropdown-menu animate-slide-up">
                  <div className="dropdown-header-row">
                    <span className="dropdown-header">Ajustes y Datos</span>
                    <button
                      className="dropdown-close-btn"
                      onClick={() => setShowOptionsDropdown(false)}
                      aria-label="Cerrar ajustes"
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onOpenBudgetModal();
                      setShowOptionsDropdown(false);
                    }}
                    className="dropdown-item"
                  >
                    <Sliders size={16} className="item-icon" />
                    <span>Definir Presupuesto Mensual</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="dropdown-item"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun size={16} className="item-icon" color="#f59e0b" />
                        <span>Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon size={16} className="item-icon" />
                        <span>Modo Oscuro</span>
                      </>
                    )}
                  </button>

                  <div className="dropdown-divider" />

                  <button
                    onClick={() => {
                      onOpenAddModal('refund');
                      setShowOptionsDropdown(false);
                    }}
                    className="dropdown-item"
                  >
                    <Plus size={16} className="item-icon text-emerald" />
                    <span>Registrar Reembolso / Devolución</span>
                  </button>

                  <button onClick={handleExportCSV} className="dropdown-item">
                    <Download size={16} className="item-icon" />
                    <span>Exportar a Excel / CSV</span>
                  </button>

                  <button onClick={handleExportJSON} className="dropdown-item">
                    <Database size={16} className="item-icon" />
                    <span>Copia de seguridad (JSON)</span>
                  </button>

                  <button onClick={handleResetDemo} className="dropdown-item">
                    <Check size={16} className="item-icon" />
                    <span>Cargar Datos de Ejemplo</span>
                  </button>

                  <button onClick={handleClearAll} className="dropdown-item" style={{ color: '#ef4444' }}>
                    <Trash2 size={16} className="item-icon" style={{ color: '#ef4444' }} />
                    <span>Vaciar Todos los Movimientos</span>
                  </button>

                  <div className="dropdown-divider" />
                  <div className="currency-selector-row">
                    <span className="currency-label">Moneda:</span>
                    <div className="currency-buttons">
                      {['EUR', 'USD', 'GBP', 'MXN'].map((cur) => (
                        <button
                          key={cur}
                          onClick={() => setCurrency(cur)}
                          className={`currency-chip ${currency === cur ? 'active' : ''}`}
                        >
                          {cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '$M'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {user && (
                    <div className="dropdown-user-info" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Conectado como: <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      showToast({
                        title: 'Sesión cerrada',
                        message: 'Has cerrado sesión con éxito.',
                        type: 'info',
                      });
                    }}
                    className="dropdown-item"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <LogOut size={16} className="item-icon" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA: Add Movement */}
          <button onClick={() => onOpenAddModal('expense')} className="btn-primary" id="btn-nuevo-gasto">
            <Plus size={18} strokeWidth={2.5} />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>
    </header>
  );
};
