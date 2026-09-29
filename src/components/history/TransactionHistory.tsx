import React, { useState } from 'react';
import {
  Search,
  Trash2,
  Edit2,
  ArrowUpDown,
  Inbox,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { CATEGORIES, CATEGORY_MAP, MONTH_NAMES_ES } from '../../constants/categories';
import type { Expense, SortField, SortOrder } from '../../types/expense';
import { formatCurrency, formatDateRelative, downloadCSV } from '../../utils/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useToast } from '../ui/Toast';

interface TransactionHistoryProps {
  onEditExpense: (expense: Expense) => void;
  onOpenAddModal: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  onEditExpense,
  onOpenAddModal,
}) => {
  const {
    filteredExpenses,
    filters,
    updateFilter,
    deleteExpense,
    restoreExpense,
    currency,
  } = useExpenseContext();

  const { showToast } = useToast();

  // State for delete confirmation modal
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Pagination / Page size
  const [displayCount, setDisplayCount] = useState<number>(15);

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDelete = () => {
    if (!expenseToDelete) return;
    const deleted = deleteExpense(expenseToDelete.id);
    if (deleted) {
      showToast({
        title: 'Gasto eliminado',
        message: `${deleted.description} (${formatCurrency(deleted.amount, currency)})`,
        type: 'info',
        duration: 6000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            restoreExpense(deleted);
            showToast({
              title: 'Gasto restaurado',
              type: 'success',
            });
          },
        },
      });
    }
    setExpenseToDelete(null);
  };

  const handleExportCurrentView = () => {
    downloadCSV(
      filteredExpenses,
      `movimientos_${filters.selectedYear}_${
        filters.selectedMonth !== -1 ? MONTH_NAMES_ES[filters.selectedMonth] : 'anual'
      }.csv`
    );
    showToast({
      title: 'Exportado con éxito',
      message: `${filteredExpenses.length} movimientos descargados a CSV`,
      type: 'success',
    });
  };

  const visibleExpenses = filteredExpenses.slice(0, displayCount);

  return (
    <div className="history-container">
      {/* Header & Filter Controls */}
      <div className="history-header-card">
        <div className="history-title-row">
          <div>
            <h2 className="history-title">Historial de Movimientos</h2>
            <p className="history-subtitle">
              {filteredExpenses.length}{' '}
              {filteredExpenses.length === 1 ? 'gasto registrado' : 'gastos registrados'} • Total:{' '}
              <strong className="text-emerald tabular-nums">
                {formatCurrency(totalFilteredAmount, currency)}
              </strong>
            </p>
          </div>

          {filteredExpenses.length > 0 && (
            <button onClick={handleExportCurrentView} className="btn-secondary btn-sm">
              <Download size={15} />
              <span>Exportar Vista</span>
            </button>
          )}
        </div>

        {/* Search and Sort Toolbar */}
        <div className="history-toolbar">
          {/* Search bar */}
          <div className="search-input-wrapper">
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por descripción, categoría o importe..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="search-input"
            />
            {filters.searchQuery && (
              <button
                onClick={() => updateFilter('searchQuery', '')}
                className="search-clear-btn"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="sort-select-wrapper">
            <ArrowUpDown size={15} className="sort-icon" />
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                updateFilter('sortBy', field);
                updateFilter('sortOrder', order);
              }}
              className="sort-select"
            >
              <option value="date-desc">Fecha: Más reciente</option>
              <option value="date-asc">Fecha: Más antiguo</option>
              <option value="amount-desc">Importe: Mayor a menor</option>
              <option value="amount-asc">Importe: Menor a mayor</option>
              <option value="description-asc">Descripción: A - Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Badges */}
        <div className="category-filter-chips-row">
          <button
            onClick={() => updateFilter('selectedCategory', 'all')}
            className={`filter-chip ${filters.selectedCategory === 'all' ? 'active' : ''}`}
          >
            Todos ({filteredExpenses.length})
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = filters.selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter('selectedCategory', isSelected ? 'all' : cat.id)}
                className={`filter-chip ${isSelected ? 'active' : ''}`}
                style={{
                  backgroundColor: isSelected ? cat.bgColor : undefined,
                  color: isSelected ? cat.color : undefined,
                  borderColor: isSelected ? cat.color : undefined,
                }}
              >
                <CategoryIcon categoryId={cat.id} size={14} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions List / Table */}
      <div className="transactions-list-card">
        {filteredExpenses.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Fecha</th>
                    <th style={{ width: '180px' }}>Categoría</th>
                    <th>Descripción / Comentario</th>
                    <th style={{ width: '120px' }}>Método</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Importe</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map((expense) => {
                    const cat = CATEGORY_MAP[expense.categoryId] || {
                      name: expense.categoryId,
                      color: '#64748b',
                      bgColor: '#f1f5f9',
                    };

                    return (
                      <tr key={expense.id} className="transaction-row">
                        {/* Date */}
                        <td className="cell-date">
                          <span className="date-badge">{formatDateRelative(expense.date)}</span>
                        </td>

                        {/* Category */}
                        <td className="cell-category">
                          <div
                            className="cat-badge-pill"
                            style={{
                              backgroundColor: cat.bgColor,
                              color: cat.color,
                            }}
                          >
                            <CategoryIcon categoryId={expense.categoryId} size={14} />
                            <span>{cat.name}</span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="cell-description">
                          <span className="desc-text" title={expense.description}>
                            {expense.description}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="cell-method">
                          <span className="method-tag">
                            {expense.paymentMethod === 'tarjeta'
                              ? '💳 Tarjeta'
                              : expense.paymentMethod === 'efectivo'
                              ? '💵 Efectivo'
                              : expense.paymentMethod === 'bizum'
                              ? '📱 Bizum'
                              : expense.paymentMethod === 'transferencia'
                              ? '🏦 Transf.'
                              : '📦 Otro'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="cell-amount">
                          <span className="amount-negative tabular-nums">
                            - {formatCurrency(expense.amount, currency)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="cell-actions">
                          <div className="action-buttons-group">
                            <button
                              onClick={() => onEditExpense(expense)}
                              className="action-btn edit-btn"
                              title="Editar gasto"
                              aria-label="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(expense)}
                              className="action-btn delete-btn"
                              title="Eliminar gasto"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Compact Card View (Automatic CSS Switch) */}
            <div className="transactions-mobile-list">
              {visibleExpenses.map((expense) => {
                const cat = CATEGORY_MAP[expense.categoryId] || {
                  name: expense.categoryId,
                  color: '#64748b',
                  bgColor: '#f1f5f9',
                };

                return (
                  <div key={expense.id} className="mobile-transaction-card">
                    <div className="mobile-card-left">
                      <div
                        className="mobile-cat-icon"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        <CategoryIcon categoryId={expense.categoryId} size={18} />
                      </div>
                      <div className="mobile-card-details">
                        <span className="mobile-desc">{expense.description}</span>
                        <div className="mobile-meta">
                          <span className="mobile-date">{formatDateRelative(expense.date)}</span>
                          <span className="mobile-dot">•</span>
                          <span className="mobile-cat-name" style={{ color: cat.color }}>
                            {cat.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-right">
                      <span className="mobile-amount tabular-nums">
                        - {formatCurrency(expense.amount, currency)}
                      </span>
                      <div className="mobile-actions">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="action-btn edit-btn"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(expense)}
                          className="action-btn delete-btn"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {filteredExpenses.length > displayCount && (
              <div className="load-more-container">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 15)}
                  className="btn-secondary"
                >
                  Mostrar más movimientos ({filteredExpenses.length - displayCount} restantes)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="history-empty-state">
            <div className="empty-state-icon">
              <Inbox size={42} color="#94a3b8" />
            </div>
            <h3 className="empty-title">No hay gastos que coincidan</h3>
            <p className="empty-desc">
              {filters.searchQuery || filters.selectedCategory !== 'all'
                ? 'Prueba a ajustar los filtros o el término de búsqueda.'
                : 'No tienes gastos registrados para este mes o año seleccionado.'}
            </p>
            <button onClick={onOpenAddModal} className="btn-primary" style={{ marginTop: '16px' }}>
              Registrar primer gasto
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="modal-overlay" onClick={() => setExpenseToDelete(null)}>
          <div
            className="modal-dialog-confirm animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon-circle">
              <AlertTriangle size={26} color="#dc2626" />
            </div>
            <h3 className="confirm-title">¿Eliminar este gasto?</h3>
            <p className="confirm-text">
              Estás a punto de eliminar <strong>"{expenseToDelete.description}"</strong> por un
              importe de{' '}
              <strong className="tabular-nums">
                {formatCurrency(expenseToDelete.amount, currency)}
              </strong>
              . Esta acción se puede deshacer inmediatamente desde la notificación.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setExpenseToDelete(null)} className="btn-cancel">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="btn-danger">
                <Trash2 size={16} />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
