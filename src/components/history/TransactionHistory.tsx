import React, { useState } from 'react';
import {
  Search,
  Trash2,
  Edit2,
  ArrowUpDown,
  Inbox,
  Download,
  AlertTriangle,
  RotateCcw,
  TrendingDown,
} from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { CATEGORIES, CATEGORY_MAP, MONTH_NAMES_ES } from '../../constants/categories';
import type { Expense, SortField, SortOrder, TransactionTypeFilter } from '../../types/expense';
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

  const totalFilteredGrossExpenses = filteredExpenses
    .filter((e) => e.type !== 'refund')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalFilteredRefunds = filteredExpenses
    .filter((e) => e.type === 'refund')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalFilteredNet = Math.max(0, totalFilteredGrossExpenses - totalFilteredRefunds);

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    const target = expenseToDelete;
    const isRefund = target.type === 'refund';
    setExpenseToDelete(null);
    const deleted = await deleteExpense(target.id);
    if (deleted) {
      showToast({
        title: isRefund ? 'Reembolso eliminado' : 'Gasto eliminado',
        message: `${deleted.description} (${isRefund ? '+' : '-'}${formatCurrency(deleted.amount, currency)})`,
        type: 'info',
        duration: 6000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await restoreExpense(deleted);
            showToast({
              title: isRefund ? 'Reembolso restaurado' : 'Gasto restaurado',
              type: 'success',
            });
          },
        },
      });
    }
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
            <div className="history-subtitle-stats">
              <span>
                {filteredExpenses.length}{' '}
                {filteredExpenses.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}
              </span>
              <span className="history-stats-dot">•</span>
              <span>
                Gastos: <strong className="tabular-nums">{formatCurrency(totalFilteredGrossExpenses, currency)}</strong>
              </span>
              {totalFilteredRefunds > 0 && (
                <>
                  <span className="history-stats-dot">•</span>
                  <span className="text-emerald">
                    Devoluciones: <strong className="tabular-nums">+{formatCurrency(totalFilteredRefunds, currency)}</strong>
                  </span>
                </>
              )}
              <span className="history-stats-dot">•</span>
              <span>
                Neto:{' '}
                <strong className="text-emerald tabular-nums">
                  {formatCurrency(totalFilteredNet, currency)}
                </strong>
              </span>
            </div>
          </div>

          {filteredExpenses.length > 0 && (
            <button onClick={handleExportCurrentView} className="btn-secondary btn-sm">
              <Download size={15} />
              <span>Exportar Vista</span>
            </button>
          )}
        </div>

        {/* Type Switcher Filter (Todos / Solo Gastos / Solo Reembolsos) */}
        <div className="history-type-filter-row">
          <div className="type-pills-wrapper">
            {(
              [
                { key: 'all', label: 'Todos los Movimientos' },
                { key: 'expense', label: '💸 Solo Gastos' },
                { key: 'refund', label: '🔄 Solo Reembolsos' },
              ] as Array<{ key: TransactionTypeFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`type-filter-pill ${filters.selectedType === tab.key ? 'active' : ''}`}
                onClick={() => updateFilter('selectedType', tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Sort Toolbar */}
        <div className="history-toolbar">
          {/* Search bar */}
          <div className="search-input-wrapper">
            <Search size={17} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por descripción, categoría, tipo o importe..."
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
            Todas las categorías ({filteredExpenses.length})
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
                    <th style={{ width: '120px' }}>Fecha</th>
                    <th style={{ width: '130px' }}>Tipo</th>
                    <th style={{ width: '170px' }}>Categoría</th>
                    <th>Descripción / Concepto</th>
                    <th style={{ width: '120px' }}>Método</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>Importe</th>
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
                    const isRefund = expense.type === 'refund';

                    return (
                      <tr key={expense.id} className={`transaction-row ${isRefund ? 'row-refund' : ''}`}>
                        {/* Date */}
                        <td className="cell-date">
                          <span className="date-badge">{formatDateRelative(expense.date)}</span>
                        </td>

                        {/* Type Badge */}
                        <td className="cell-type">
                          {isRefund ? (
                            <span className="type-badge-refund" title="Reembolso o devolución recibida">
                              <RotateCcw size={12} />
                              <span>Reembolso</span>
                            </span>
                          ) : (
                            <span className="type-badge-expense">
                              <TrendingDown size={12} />
                              <span>Gasto</span>
                            </span>
                          )}
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
                          {isRefund ? (
                            <span className="amount-positive tabular-nums" title="Importe devuelto/reembolsado">
                              + {formatCurrency(expense.amount, currency)}
                            </span>
                          ) : (
                            <span className="amount-negative tabular-nums">
                              - {formatCurrency(expense.amount, currency)}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="cell-actions">
                          <div className="action-buttons-group">
                            <button
                              onClick={() => onEditExpense(expense)}
                              className="action-btn edit-btn"
                              title={isRefund ? 'Editar reembolso' : 'Editar gasto'}
                              aria-label="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(expense)}
                              className="action-btn delete-btn"
                              title={isRefund ? 'Eliminar reembolso' : 'Eliminar gasto'}
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
                const isRefund = expense.type === 'refund';

                return (
                  <div key={expense.id} className={`mobile-transaction-card ${isRefund ? 'card-refund' : ''}`}>
                    <div className="mobile-card-left">
                      <div
                        className="mobile-cat-icon"
                        style={{
                          backgroundColor: isRefund ? '#d1fae5' : cat.bgColor,
                          color: isRefund ? '#059669' : cat.color,
                        }}
                      >
                        {isRefund ? (
                          <RotateCcw size={18} />
                        ) : (
                          <CategoryIcon categoryId={expense.categoryId} size={18} />
                        )}
                      </div>
                      <div className="mobile-card-details">
                        <span className="mobile-desc">{expense.description}</span>
                        <div className="mobile-meta">
                          <span className="mobile-date">{formatDateRelative(expense.date)}</span>
                          <span className="mobile-dot">•</span>
                          {isRefund ? (
                            <span className="mobile-cat-name text-emerald">
                              Reembolso ({cat.name})
                            </span>
                          ) : (
                            <span className="mobile-cat-name" style={{ color: cat.color }}>
                              {cat.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-right">
                      {isRefund ? (
                        <span className="mobile-amount amount-positive tabular-nums">
                          + {formatCurrency(expense.amount, currency)}
                        </span>
                      ) : (
                        <span className="mobile-amount tabular-nums">
                          - {formatCurrency(expense.amount, currency)}
                        </span>
                      )}
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
            <h3 className="empty-title">
              {filters.selectedType === 'refund'
                ? 'No hay reembolsos que coincidan'
                : filters.selectedType === 'expense'
                ? 'No hay gastos que coincidan'
                : 'No hay movimientos que coincidan'}
            </h3>
            <p className="empty-desc">
              {filters.searchQuery || filters.selectedCategory !== 'all' || filters.selectedType !== 'all'
                ? 'Prueba a ajustar los filtros o el término de búsqueda.'
                : 'No tienes movimientos registrados para este mes o año seleccionado.'}
            </p>
            <button onClick={onOpenAddModal} className="btn-primary" style={{ marginTop: '16px' }}>
              Registrar nuevo movimiento
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
            <h3 className="confirm-title">
              {expenseToDelete.type === 'refund'
                ? '¿Eliminar este reembolso?'
                : '¿Eliminar este gasto?'}
            </h3>
            <p className="confirm-text">
              Estás a punto de eliminar <strong>"{expenseToDelete.description}"</strong> por un
              importe de{' '}
              <strong className="tabular-nums">
                {expenseToDelete.type === 'refund' ? '+' : '-'}
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
