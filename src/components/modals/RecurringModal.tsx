import React, { useEffect, useState } from 'react';
import { Repeat, X, Plus, Trash2, Pause, Play } from 'lucide-react';
import { api } from '../../services/api';
import { CATEGORIES, CATEGORY_MAP } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';
import { useExpenseContext } from '../../context/ExpenseContext';
import { useToast } from '../ui/Toast';
import type { CategoryId, PaymentMethod, RecurringExpense } from '../../types/expense';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  tarjeta: 'Tarjeta', efectivo: 'Efectivo', bizum: 'Bizum', transferencia: 'Transferencia', otro: 'Otro',
};

export const RecurringModal: React.FC<RecurringModalProps> = ({ isOpen, onClose }) => {
  const { currency, reloadData } = useExpenseContext();
  const { showToast } = useToast();
  const [rules, setRules] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('vivienda');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta');
  const [day, setDay] = useState('1');
  const [includeCurrent, setIncludeCurrent] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRules(await api.recurring.list());
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const monthlyTotal = rules.filter((r) => r.active).reduce((s, r) => s + r.amount, 0);
  const today = new Date().getDate();
  const dayNum = Number(day);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || !(parsed > 0)) {
      showToast({ title: 'Faltan datos', message: 'Pon una descripción y un importe.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const r = await api.recurring.create({
        description: description.trim(), amount: parsed, categoryId, paymentMethod, dayOfMonth: dayNum, includeCurrent,
      });
      showToast({
        title: 'Gasto fijo guardado',
        message: r.created ? 'Se ha apuntado ya el de este mes.' : `Se apuntará solo el día ${dayNum} de cada mes.`,
        type: 'success',
      });
      setDescription('');
      setAmount('');
      await load();
      if (r.created) await reloadData();
    } catch (err: any) {
      showToast({ title: 'No se pudo guardar', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: RecurringExpense) => {
    try {
      const r = await api.recurring.update(rule.id, { active: !rule.active });
      await load();
      if (r.created) await reloadData();
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const remove = async (rule: RecurringExpense) => {
    if (!window.confirm(`¿Dejar de apuntar "${rule.description}" cada mes?\nLos movimientos ya apuntados se quedan.`)) return;
    try {
      await api.recurring.remove(rule.id);
      await load();
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-slide-up recurring-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-icon-badge" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Repeat size={22} />
            </div>
            <div>
              <h2 className="modal-title">Gastos fijos mensuales</h2>
              <p className="modal-subtitle">Alquiler, suscripciones, gimnasio… se apuntan solos cada mes</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-form">
          <div className="recurring-list">
            {loading && <p className="recurring-empty">Cargando…</p>}
            {!loading && rules.length === 0 && (
              <p className="recurring-empty">Aún no tienes gastos fijos. Añade el primero abajo.</p>
            )}
            {rules.map((r) => {
              const cat = CATEGORY_MAP[r.categoryId];
              return (
                <div key={r.id} className={`recurring-row ${r.active ? '' : 'paused'}`}>
                  <span className="recurring-dot" style={{ background: cat?.color || '#64748b' }} />
                  <div className="recurring-info">
                    <span className="recurring-desc">{r.description}</span>
                    <span className="recurring-meta">
                      Día {r.dayOfMonth} · {cat?.name || r.categoryId} · {PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod}
                      {!r.active && ' · en pausa'}
                    </span>
                  </div>
                  <span className="recurring-amount tabular-nums">{formatCurrency(r.amount, currency)}</span>
                  <button className="recurring-icon-btn" onClick={() => toggle(r)} title={r.active ? 'Pausar' : 'Reanudar'}>
                    {r.active ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button className="recurring-icon-btn danger" onClick={() => remove(r)} title="Quitar">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {rules.length > 0 && (
              <div className="recurring-total">
                <span>Total fijo al mes</span>
                <strong className="tabular-nums">{formatCurrency(monthlyTotal, currency)}</strong>
              </div>
            )}
          </div>

          <form onSubmit={handleAdd} className="recurring-form">
            <h3 className="recurring-form-title">Añadir gasto fijo</h3>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-text-input" value={description} maxLength={200}
                onChange={(e) => setDescription(e.target.value)} placeholder="Alquiler, Netflix, gimnasio…" />
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Importe ({currency === 'EUR' ? '€' : currency})</label>
                <input className="form-text-input tabular-nums" inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Día del mes</label>
                <select className="form-text-input select-styled" value={day} onChange={(e) => setDay(e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}{d > 28 ? ' (o último día)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-text-input select-styled" value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value as CategoryId)}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pago</label>
                <select className="form-text-input select-styled" value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {dayNum <= today && (
              <label className="recurring-check">
                <input type="checkbox" checked={includeCurrent} onChange={(e) => setIncludeCurrent(e.target.checked)} />
                <span>El día {dayNum} ya ha pasado: apuntar también el de este mes</span>
              </label>
            )}
            <div className="modal-actions">
              <button type="submit" className="btn-submit-primary" disabled={saving}>
                <Plus size={18} />
                <span>{saving ? 'Guardando…' : 'Añadir gasto fijo'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
