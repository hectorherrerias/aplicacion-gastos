import React, { useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useExpenseContext } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { MONTH_NAMES_ES, MONTH_SHORT_ES } from '../../constants/categories';

// Register ChartJS modules
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

export const ChartsSection: React.FC = () => {
  const {
    categoryBreakdown,
    monthlySummary,
    filters,
    updateFilter,
    currency,
    kpiMetrics,
  } = useExpenseContext();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [annualChartType, setAnnualChartType] = useState<'bar' | 'line'>('bar');
  const isAllYear = filters.selectedMonth === -1;
  const currentPeriodName = isAllYear ? `Año ${filters.selectedYear}` : `${MONTH_NAMES_ES[filters.selectedMonth]} ${filters.selectedYear}`;

  const hasCategoryData = categoryBreakdown.some((c) => c.total > 0);
  const hasYearlyData = monthlySummary.some((m) => m.total > 0);

  // 1. Doughnut Chart Configuration
  const doughnutData = {
    labels: categoryBreakdown.map((item) => item.category.name),
    datasets: [
      {
        data: categoryBreakdown.map((item) => item.total),
        backgroundColor: categoryBreakdown.map((item) => item.category.color),
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 2.5,
        hoverOffset: 8,
        hoverBorderColor: isDark ? '#111827' : '#ffffff',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false, // We render a custom high-end interactive legend list
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: isDark ? '#334155' : 'transparent',
        borderWidth: isDark ? 1 : 0,
        titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' as const },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context: TooltipItem<'doughnut'>) {
            const raw = context.raw as number;
            const total = kpiMetrics.currentMonthTotal;
            const percentage = total > 0 ? ((raw / total) * 100).toFixed(1) : '0';
            return ` ${formatCurrency(raw, currency)} (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 750,
    },
  };

  // 2. Bar / Line Chart Configuration (12 months)
  const yearlyChartData = {
    labels: MONTH_SHORT_ES,
    datasets:
      annualChartType === 'bar'
        ? [
            {
              label: 'Gastos',
              data: monthlySummary.map((m) => m.totalExpenses),
              backgroundColor: monthlySummary.map((m) =>
                !isAllYear && m.monthIndex === filters.selectedMonth
                  ? '#2563eb'
                  : isDark
                  ? '#3b82f6'
                  : '#93c5fd'
              ),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 24,
            },
            {
              label: 'Reembolsos',
              data: monthlySummary.map((m) => m.totalRefunds),
              backgroundColor: monthlySummary.map((m) =>
                !isAllYear && m.monthIndex === filters.selectedMonth
                  ? '#059669'
                  : '#34d399'
              ),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 24,
            },
          ]
        : [
            {
              label: 'Gasto Neto Mensual',
              data: monthlySummary.map((m) => m.totalNet),
              borderColor: '#10b981',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#10b981',
              pointBorderColor: isDark ? '#111827' : '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
  };

  const yearlyChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const clickedIndex = elements[0].index;
        updateFilter('selectedMonth', clickedIndex);
      }
    },
    plugins: {
      legend: {
        display: annualChartType === 'bar',
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          color: isDark ? '#94a3b8' : '#64748b',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: isDark ? '#334155' : 'transparent',
        borderWidth: isDark ? 1 : 0,
        titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' as const },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: function (items: any[]) {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            return `${MONTH_NAMES_ES[idx]} ${filters.selectedYear}`;
          },
          label: function (context: any) {
            const idx = context.dataIndex;
            const item = monthlySummary[idx];
            if (!item) return '';

            if (annualChartType === 'line') {
              return [
                ` Gasto neto: ${formatCurrency(item.totalNet, currency)}`,
                ` Gastos: ${formatCurrency(item.totalExpenses, currency)} (${item.expensesCount})`,
                ` Reembolsos: +${formatCurrency(item.totalRefunds, currency)} (${item.refundsCount})`,
              ];
            }

            if (context.datasetIndex === 0) {
              return ` Gastos brutos: ${formatCurrency(item.totalExpenses, currency)} (${item.expensesCount})`;
            } else {
              return ` Reembolsos: +${formatCurrency(item.totalRefunds, currency)} (${item.refundsCount})`;
            }
          },
          footer: function (items: any[]) {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const item = monthlySummary[idx];
            if (!item || annualChartType === 'line') return '';
            return `Gasto Neto: ${formatCurrency(item.totalNet, currency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 12 },
          color: isDark ? '#94a3b8' : '#64748b',
        },
      },
      y: {
        border: {
          dash: [4, 4],
        },
        grid: {
          color: isDark ? '#1f293d' : '#f1f5f9',
        },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 11 },
          color: isDark ? '#94a3b8' : '#94a3b8',
          callback: function (val: any) {
            return `${formatNumber(val, 0)} ${currency === 'EUR' ? '€' : currency}`;
          },
        },
      },
    },
  };

  return (
    <div className="charts-grid">
      {/* 1. Categorical Distribution (Donut Chart) */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <div className="chart-title-badge">
              <PieIcon size={15} />
              <span>Distribución por Categorías</span>
            </div>
            <h3 className="chart-card-title">Gastos Netos de {currentPeriodName}</h3>
          </div>
          <span className="chart-subtitle-tag">{categoryBreakdown.filter(c => c.total > 0).length} categorías activas</span>
        </div>

        <div className="doughnut-content-wrapper">
          {hasCategoryData ? (
            <>
              <div className="doughnut-canvas-container">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="doughnut-center-metric">
                  <span className="center-label">Gasto Neto</span>
                  <span className="center-value tabular-nums">
                    {formatCurrency(kpiMetrics.currentMonthTotal, currency)}
                  </span>
                </div>
              </div>

              {/* High-End Category Breakdown List */}
              <div className="category-legend-list">
                {categoryBreakdown.map((item) => {
                  if (item.total === 0 && item.totalRefunds === 0) return null;
                  return (
                    <div
                      key={item.category.id}
                      className="category-legend-row"
                      onClick={() =>
                        updateFilter(
                          'selectedCategory',
                          filters.selectedCategory === item.category.id ? 'all' : item.category.id
                        )
                      }
                      title={`Filtrar por ${item.category.name}`}
                      style={{
                        cursor: 'pointer',
                        opacity:
                          filters.selectedCategory === 'all' ||
                          filters.selectedCategory === item.category.id
                            ? 1
                            : 0.4,
                      }}
                    >
                      <div className="legend-row-left">
                        <div
                          className="legend-color-dot"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <div
                          className="legend-icon-badge"
                          style={{
                            backgroundColor: item.category.bgColor,
                            color: item.category.color,
                          }}
                        >
                          <CategoryIcon categoryId={item.category.id} size={14} />
                        </div>
                        <div className="legend-text-col">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="legend-cat-name">{item.category.name}</span>
                            {item.totalRefunds > 0 && (
                              <span className="category-refund-chip" title={`Reembolsado en ${item.category.name}`}>
                                +{formatCurrency(item.totalRefunds, currency)}
                              </span>
                            )}
                          </div>
                          <div className="legend-mini-bar-track">
                            <div
                              className="legend-mini-bar-fill"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.category.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="legend-row-right">
                        <span className="legend-amount tabular-nums">
                          {formatCurrency(item.total, currency)}
                        </span>
                        <span className="legend-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="chart-empty-state">
              <div className="empty-icon-circle">
                <PieIcon size={32} color="#94a3b8" />
              </div>
              <h4>Sin movimientos registrados en este periodo</h4>
              <p>Añade un nuevo gasto o reembolso para visualizar la distribución porcentual.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Monthly Evolution Throughout the Year (Bar / Line Chart) */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <div className="chart-title-badge">
              <BarChart3 size={15} />
              <span>Evolución Anual</span>
            </div>
            <h3 className="chart-card-title">Gastos y Reembolsos en {filters.selectedYear}</h3>
          </div>

          {/* Toggle View: Bar vs Line */}
          <div className="chart-type-toggle">
            <button
              className={`toggle-btn ${annualChartType === 'bar' ? 'active' : ''}`}
              onClick={() => setAnnualChartType('bar')}
              title="Comparativa mensual de gastos y reembolsos"
            >
              <BarChart3 size={15} />
              <span>Gastos vs Devoluciones</span>
            </button>
            <button
              className={`toggle-btn ${annualChartType === 'line' ? 'active' : ''}`}
              onClick={() => setAnnualChartType('line')}
              title="Tendencia de gasto neto mensual"
            >
              <TrendingUp size={15} />
              <span>Gasto Neto</span>
            </button>
          </div>
        </div>

        <div className="yearly-chart-container">
          {hasYearlyData ? (
            <>
              <div style={{ height: '280px', position: 'relative' }}>
                {annualChartType === 'bar' ? (
                  <Bar data={yearlyChartData} options={yearlyChartOptions} />
                ) : (
                  <Line data={yearlyChartData} options={yearlyChartOptions} />
                )}
              </div>
              <div className="chart-footer-hint">
                <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                <span>Haz clic en cualquier mes para filtrar los datos y movimientos de ese mes</span>
              </div>
            </>
          ) : (
            <div className="chart-empty-state">
              <div className="empty-icon-circle">
                <BarChart3 size={32} color="#94a3b8" />
              </div>
              <h4>Sin datos anuales para {filters.selectedYear}</h4>
              <p>Comienza a registrar movimientos para ver la evolución mes a mes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
