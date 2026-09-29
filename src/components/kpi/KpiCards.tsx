import React from 'react';
import {
  TrendingUp,
  CalendarDays,
  CreditCard,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { MONTH_NAMES_ES } from '../../constants/categories';

interface KpiCardsProps {
  onOpenBudgetModal?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ onOpenBudgetModal }) => {
  const { kpiMetrics, filters, currency } = useExpenseContext();

  const isAllYear = filters.selectedMonth === -1;
  const currentMonthName = isAllYear ? 'Todo el año' : MONTH_NAMES_ES[filters.selectedMonth];

  const {
    currentMonthTotal,
    previousMonthTotal,
    monthDiffPercentage,
    topCategory,
    yearlyTotal,
    monthlyAverage,
    dailyAverage,
    transactionCount,
    budgetMonthly,
    budgetUsedPercentage,
  } = kpiMetrics;

  const isOverBudget = !isAllYear && budgetMonthly > 0 && currentMonthTotal > budgetMonthly;
  const isCloseToBudget = !isAllYear && budgetMonthly > 0 && budgetUsedPercentage >= 85 && !isOverBudget;

  return (
    <div className="kpi-grid">
      {/* Card 1: Gasto en el Periodo (Este Mes / Todo el año) */}
      <div className="kpi-card card-primary-highlight">
        <div className="kpi-card-header">
          <div className="kpi-title-group">
            <span className="kpi-tag">{currentMonthName}</span>
            <h3 className="kpi-label">
              {isAllYear ? 'Gasto Total del Año' : 'Total Gastado este Mes'}
            </h3>
          </div>
          <div className="kpi-icon-pill kpi-icon-emerald">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value tabular-nums">
            {formatCurrency(currentMonthTotal, currency)}
          </div>

          {/* Month vs Previous Month Comparison */}
          {!isAllYear && monthDiffPercentage !== null && (
            <div className="kpi-comparison">
              <span
                className={`kpi-badge ${
                  monthDiffPercentage > 0 ? 'badge-warning' : 'badge-success'
                }`}
              >
                {monthDiffPercentage > 0 ? (
                  <>
                    <ArrowUpRight size={14} /> +{monthDiffPercentage}%
                  </>
                ) : (
                  <>
                    <ArrowDownRight size={14} /> {monthDiffPercentage}%
                  </>
                )}
              </span>
              <span className="kpi-subtext">
                vs mes anterior ({formatCurrency(previousMonthTotal, currency)})
              </span>
            </div>
          )}

          {/* Budget indicator bar if active */}
          {!isAllYear && budgetMonthly > 0 && (
            <div
              className="kpi-budget-progress-container"
              onClick={onOpenBudgetModal}
              title="Haz clic para modificar el presupuesto mensual"
            >
              <div className="kpi-budget-header">
                <span className="kpi-budget-label">
                  <Target size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Presupuesto ({formatCurrency(budgetMonthly, currency)})
                </span>
                <span
                  className={`kpi-budget-percent ${
                    isOverBudget ? 'text-danger' : isCloseToBudget ? 'text-amber' : 'text-emerald'
                  }`}
                >
                  {formatNumber(budgetUsedPercentage, 0)}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${
                    isOverBudget ? 'fill-danger' : isCloseToBudget ? 'fill-amber' : 'fill-emerald'
                  }`}
                  style={{ width: `${Math.min(100, budgetUsedPercentage)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Categoría con Mayor Gasto */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-title-group">
            <span className="kpi-tag">Top Categoría</span>
            <h3 className="kpi-label">Mayor Gasto</h3>
          </div>
          <div
            className="kpi-icon-pill"
            style={{
              backgroundColor: topCategory ? topCategory.category.bgColor : '#f1f5f9',
              color: topCategory ? topCategory.category.color : '#64748b',
            }}
          >
            {topCategory ? (
              <CategoryIcon categoryId={topCategory.category.id} size={20} />
            ) : (
              <PieChart size={20} />
            )}
          </div>
        </div>

        <div className="kpi-body">
          {topCategory ? (
            <>
              <div className="kpi-top-category-name">
                {topCategory.category.name}
              </div>
              <div className="kpi-top-category-stats">
                <span className="kpi-value-secondary tabular-nums">
                  {formatCurrency(topCategory.total, currency)}
                </span>
                <span className="kpi-pill-percent">
                  {topCategory.percentage}% del total
                </span>
              </div>
              <span className="kpi-subtext">
                {topCategory.count} {topCategory.count === 1 ? 'movimiento' : 'movimientos'} registrados
              </span>
            </>
          ) : (
            <div className="kpi-empty-state">
              <p className="kpi-empty-text">Sin gastos en este periodo</p>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Total Anual */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-title-group">
            <span className="kpi-tag">Año {filters.selectedYear}</span>
            <h3 className="kpi-label">Total Anual Acumulado</h3>
          </div>
          <div className="kpi-icon-pill kpi-icon-blue">
            <CalendarDays size={20} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value tabular-nums">
            {formatCurrency(yearlyTotal, currency)}
          </div>
          <div className="kpi-meta-row">
            <span className="kpi-meta-label">Media mensual:</span>
            <span className="kpi-meta-val tabular-nums">
              {formatCurrency(monthlyAverage, currency)}/mes
            </span>
          </div>
          <span className="kpi-subtext">Calculado sobre 12 meses de {filters.selectedYear}</span>
        </div>
      </div>

      {/* Card 4: Gasto Diario Medio / Movimientos */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-title-group">
            <span className="kpi-tag">Actividad</span>
            <h3 className="kpi-label">Gasto Diario Promedio</h3>
          </div>
          <div className="kpi-icon-pill kpi-icon-purple">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value tabular-nums">
            {formatCurrency(dailyAverage, currency)}
            <span className="kpi-unit">/día</span>
          </div>
          <div className="kpi-meta-row">
            <span className="kpi-meta-label">Transacciones:</span>
            <span className="kpi-meta-val">
              {transactionCount} {transactionCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <span className="kpi-subtext">
            {isAllYear ? 'Distribución a lo largo del año' : `Periodo de ${currentMonthName}`}
          </span>
        </div>
      </div>
    </div>
  );
};
