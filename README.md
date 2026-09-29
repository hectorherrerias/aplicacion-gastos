# GastosPro — Gestor de Gastos Personales & Dashboard Fintech

Aplicación web moderna, minimalista y profesional para el control inteligente, análisis gráfico y gestión de gastos personales, desarrollada con **React**, **TypeScript**, **Vite** y **Chart.js**.

![GastosPro Dashboard](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80)

---

## ✨ Características Principales

- **Tarjetas de Resumen (KPIs)**:
  - Total gastado en el mes con comparativa respecto al mes anterior.
  - Categoría predominante de gasto con porcentaje e importe.
  - Total anual acumulado y media mensual estimada.
  - Gasto diario promedio y conteo de transacciones.
  - Barra de progreso del objetivo de presupuesto mensual con avisos visuales.

- **Visualización Gráfica Interactiva**:
  - **Gráfico Donut**: Distribución porcentual por categorías para el mes seleccionado, con desglose detallado interactivo.
  - **Gráfico de Evolución Anual**: Seguimiento mes a mes (Enero a Diciembre) con opción de alternar entre vista de **Barras** y **Línea de tendencia**, resaltando el mes activo.
  - **Filtro Global de Mes y Año**: Selector dinámico en la cabecera que sincroniza todas las métricas en tiempo real.

- **Formulario de Ingreso Rápido**:
  - Selector de importe con atajos rápidos (+5€, +10€, +20€, +50€, +100€).
  - Selector de categoría visual por chips (*Vivienda*, *Alimentación*, *Transporte*, *Ocio*, *Salud*, *Educación*, *Otros*).
  - Presets de fecha ("Hoy" y "Ayer").
  - Comentario y método de pago (*Tarjeta*, *Efectivo*, *Bizum*, *Transferencia*).
  - Feedback visual inmediato y animación de confeti.

- **Historial de Movimientos**:
  - Búsqueda en tiempo real por texto (descripción, importe o categoría).
  - Filtrado rápido por categoría.
  - Ordenación personalizada (Más reciente, Mayor/Menor importe, Alfabético).
  - Botón para editar cualquier gasto y botón para eliminar con confirmación y acción inmediata de **"Deshacer"**.

- **Almacenamiento y Exportación**:
  - Persistencia total y automática en `localStorage`.
  - Exportación a archivo **CSV** (con formato UTF-8 BOM compatible con Microsoft Excel y Numbers).
  - Copia de seguridad en archivo **JSON**.
  - Opciones para vaciar gastos o cargar datos de muestra.

---

## 🚀 Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/hectorherrerias/aplicacion-gastos.git

# 2. Entrar en la carpeta
cd aplicacion-gastos

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver la aplicación.

---

## 🛠️ Tecnologías

- **React 19**
- **TypeScript**
- **Vite**
- **Chart.js** & **react-chartjs-2**
- **Lucide Icons**
- **Canvas-Confetti**
- **CSS3 Design Tokens** (Glassmorphism & Responsive layout)
