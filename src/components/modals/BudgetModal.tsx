import React, { useState } from 'react';
import { Target, X, Check } from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../ui/Toast';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose }) => {
  const { budgetMonthly, setBudgetMonthly, currency, kpiMetrics } = useExpenseContext();
  const { showToast } = useToast();

  const [inputBudget, setInputBudget] = useState<string>(budgetMonthly.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputBudget.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      return;
    }

    setBudgetMonthly(parsed);
    showToast({
      title: 'Presupuesto mensual actualizado',
      message: `Objetivo fijado en ${formatCurrency(parsed, currency)} / mes`,
      type: 'success',
    });
    onClose();
  };

  const currentSpent = kpiMetrics.currentMonthTotal;
  const parsedVal = parseFloat(inputBudget.replace(',', '.')) || 0;
  const remaining = parsedVal - currentSpent;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog-confirm animate-slide-up"
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: 0, marginBottom: '20px' }}>
          <div className="modal-header-info">
            <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Target size={22} />
            </div>
            <div>
              <h2 className="modal-title">Presupuesto Mensual</h2>
              <p className="modal-subtitle">Establece un límite de gasto objetivo por mes</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="budget-input">
              Límite de Gasto Mensual ({currency === 'EUR' ? '€' : currency})
            </label>
            <div className="amount-input-wrapper">
              <span className="amount-currency-symbol">
                {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '$'}
              </span>
              <input
                id="budget-input"
                type="number"
                step="50"
                min="0"
                value={inputBudget}
                onChange={(e) => setInputBudget(e.target.value)}
                className="amount-input tabular-nums"
                autoFocus
              />
            </div>

            {/* Quick preset buttons */}
            <div className="quick-amount-row" style={{ marginTop: '10px' }}>
              {[1000, 1500, 2000, 2500, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInputBudget(preset.toString())}
                  className={`quick-amount-pill ${parsedVal === preset ? 'active' : ''}`}
                >
                  {formatCurrency(preset, currency)}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Preview Status */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              margin: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Gasto actual este mes:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }} className="tabular-nums">
                {formatCurrency(currentSpent, currency)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Margen disponible:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: remaining >= 0 ? '#059669' : '#dc2626',
                }}
                className="tabular-nums"
              >
                {remaining >= 0 ? '+' : ''}
                {formatCurrency(remaining, currency)}
              </span>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-submit-primary">
              <Check size={18} />
              <span>Guardar Presupuesto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
