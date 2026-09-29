import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  FileText,
  CreditCard,
  Sparkles,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useExpenseContext } from '../../context/ExpenseContext';
import { CATEGORIES } from '../../constants/categories';
import type { CategoryId, Expense, PaymentMethod } from '../../types/expense';
import { formatDateForInput } from '../../utils/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useToast } from '../ui/Toast';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
}) => {
  const { addExpense, editExpense, currency } = useExpenseContext();
  const { showToast } = useToast();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateForInput(new Date()));
  const [categoryId, setCategoryId] = useState<CategoryId>('alimentacion');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Suggestions for rapid entry
  const popularDescriptions = [
    'Supermercado',
    'Restaurante / Comida',
    'Factura Luz / Agua',
    'Gasolina / Transporte',
    'Farmacia / Salud',
    'Cine / Salida',
  ];

  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setDate(expenseToEdit.date);
      setCategoryId(expenseToEdit.categoryId);
      setDescription(expenseToEdit.description);
      setPaymentMethod(expenseToEdit.paymentMethod || 'tarjeta');
      setErrorMsg('');
    } else {
      setAmount('');
      setDate(formatDateForInput(new Date()));
      setCategoryId('alimentacion');
      setDescription('');
      setPaymentMethod('tarjeta');
      setErrorMsg('');
    }
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Por favor introduce un importe válido mayor que 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Por favor añade una breve descripción o comentario del gasto.');
      return;
    }

    if (!date) {
      setErrorMsg('Por favor selecciona una fecha.');
      return;
    }

    if (expenseToEdit) {
      editExpense(expenseToEdit.id, {
        amount: parsedAmount,
        date,
        categoryId,
        description: description.trim(),
        paymentMethod,
      });

      showToast({
        title: 'Gasto actualizado',
        message: `${description.trim()} modificado correctamente.`,
        type: 'success',
      });
    } else {
      addExpense({
        amount: parsedAmount,
        date,
        categoryId,
        description: description.trim(),
        paymentMethod,
      });

      // Celebration micro-interaction
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#059669', '#3b82f6', '#8b5cf6'],
        });
      } catch (e) {
        // Safe fallback
      }

      showToast({
        title: '¡Gasto registrado con éxito!',
        message: `${description.trim()} (${parsedAmount.toFixed(2)} ${currency === 'EUR' ? '€' : currency})`,
        type: 'success',
      });
    }

    onClose();
  };

  const handleQuickAmount = (extra: number) => {
    const current = parseFloat(amount.replace(',', '.')) || 0;
    setAmount((current + extra).toString());
  };

  const setDateToday = () => {
    setDate(formatDateForInput(new Date()));
  };

  const setDateYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setDate(formatDateForInput(yest));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-icon-badge">
              {expenseToEdit ? <FileText size={20} /> : <Sparkles size={20} />}
            </div>
            <div>
              <h2 className="modal-title">
                {expenseToEdit ? 'Editar Gasto' : 'Nuevo Registro de Gasto'}
              </h2>
              <p className="modal-subtitle">
                {expenseToEdit
                  ? 'Modifica los detalles del registro seleccionado'
                  : 'Completa los campos para añadir un nuevo movimiento'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            title="Cerrar modal"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="form-error-alert animate-fade-in">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 1. Amount Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-amount">
              Importe ({currency === 'EUR' ? '€' : currency})
              <span className="required-star">*</span>
            </label>
            <div className="amount-input-wrapper">
              <span className="amount-currency-symbol">
                {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '$'}
              </span>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrorMsg('');
                }}
                className="amount-input tabular-nums"
                autoFocus
                required
              />
            </div>

            {/* Quick Amount Add Pills */}
            <div className="quick-amount-row">
              <span className="quick-label">Rápido:</span>
              {[5, 10, 20, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="quick-amount-pill"
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="quick-amount-clear"
                title="Limpiar importe"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* 2. Category Selector */}
          <div className="form-group">
            <label className="form-label">
              Categoría <span className="required-star">*</span>
            </label>
            <div className="category-chips-grid">
              {CATEGORIES.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setErrorMsg('');
                    }}
                    className={`category-chip-btn ${isSelected ? 'selected' : ''}`}
                    style={{
                      borderColor: isSelected ? cat.color : undefined,
                      backgroundColor: isSelected ? cat.bgColor : undefined,
                      color: isSelected ? cat.color : undefined,
                    }}
                  >
                    <CategoryIcon categoryId={cat.id} size={17} />
                    <span className="cat-chip-name">{cat.name}</span>
                    {isSelected && <Check size={14} className="cat-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Description & Comment */}
          <div className="form-group">
            <label className="form-label" htmlFor="expense-description">
              Comentario / Descripción <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <FileText size={17} className="field-icon" />
              <input
                id="expense-description"
                type="text"
                placeholder="Ej. Compra semanal en Mercadona, Cena, Gasolina..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrorMsg('');
                }}
                className="form-text-input"
                required
              />
            </div>

            {/* Description Suggestions */}
            <div className="desc-suggestions-row">
              {popularDescriptions.map((desc) => (
                <button
                  key={desc}
                  type="button"
                  onClick={() => setDescription(desc)}
                  className="desc-suggestion-chip"
                >
                  {desc}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Date Picker & Payment Method in 2 columns */}
          <div className="form-row-2col">
            <div className="form-group">
              <div className="label-with-presets">
                <label className="form-label" htmlFor="expense-date">
                  Fecha <span className="required-star">*</span>
                </label>
                <div className="date-quick-presets">
                  <button type="button" onClick={setDateToday} className="date-preset-btn">
                    Hoy
                  </button>
                  <button type="button" onClick={setDateYesterday} className="date-preset-btn">
                    Ayer
                  </button>
                </div>
              </div>
              <div className="input-with-icon">
                <Calendar size={17} className="field-icon" />
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-text-input"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Método de Pago</label>
              <div className="input-with-icon">
                <CreditCard size={17} className="field-icon" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="form-text-input select-styled"
                >
                  <option value="tarjeta">💳 Tarjeta Débito / Crédito</option>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="bizum">📱 Bizum</option>
                  <option value="transferencia">🏦 Transferencia Bancaria</option>
                  <option value="otro">📦 Otro método</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-submit-primary">
              <Plus size={18} />
              <span>{expenseToEdit ? 'Guardar Cambios' : 'Registrar Gasto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
