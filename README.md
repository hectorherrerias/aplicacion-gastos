# GastosPro — Gestor de Gastos Personales (Self-Hosted SQLite + Docker)

Aplicación web Full-Stack moderna, minimalista y profesional para el control inteligente, análisis gráfico y gestión de gastos personales. Diseñada específicamente para ser **auto-alojada (Self-Hosted)** en tu propio servidor local o contenedor **Proxmox LXC** con **SQLite** y **Docker**.

---

## 🌟 Arquitectura y Ventajas de SQLite

- **Base de datos automática**: No requiere instalar ni configurar servidores de bases de datos externos (como MySQL o PostgreSQL).
- **Auto-inicialización en el arranque**: El servidor Express detecta automáticamente si existe el archivo `data/database.sqlite`. Si no existe, lo crea al vuelo y ejecuta las migraciones (`CREATE TABLE IF NOT EXISTS users, expenses, settings`).
- **Usuario administrador pre-configurado**: Crea un usuario administrador seguro con contraseña hash (`bcrypt`) en el primer inicio.
- **Persistencia garantizada**: Todos los datos se guardan en un único archivo SQLite mapeado a un volumen Docker local (`./data:/app/data`), asegurando que ninguna actualización de contenedor borre tus registros.

---

## 🔒 Autenticación & Seguridad

- **Pantalla de Login Fintech**: Protegida con autenticación mediante **JWT (JSON Web Tokens)**.
- **Credenciales por defecto**:
  - **Usuario**: `admin`
  - **Contraseña**: `admin123`
  *(Personalizables en el archivo `.env` o variables de entorno de Docker).*
- **Cierre de sesión y protección de API**: Todos los endpoints de gastos están protegidos con middleware de autorización.

---

## 🐳 Despliegue con Docker & Docker Compose (Recomendado para Proxmox LXC)

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/hectorherrerias/aplicacion-gastos.git
cd aplicacion-gastos
```

### Paso 2: Configurar variables de entorno (Opcional)
Puedes copiar `.env.example` a `.env` y cambiar tu usuario o contraseña:
```bash
cp .env.example .env
```

### Paso 3: Levantar todo con un solo comando
```bash
docker compose up -d --build
```

¡Listo! La aplicación estará disponible de inmediato en:
👉 **`http://<IP-DE-TU-SERVIDOR-O-LXC>:3000`**

Para detener la aplicación:
```bash
docker compose down
```

---

## 🖥️ Despliegue Manual con Node.js (Sin Docker)

Si prefieres ejecutarla directamente en el contenedor LXC con Node.js instalado (Node 20+):

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar frontend para producción
npm run build

# 3. Iniciar el servidor SQLite
npm start
```
Accede a **`http://localhost:3000`**.

---

## 💻 Desarrollo Local (Frontend Vite + Backend Express)

Para trabajar en local con hot-reload tanto en el frontend como en el backend:

```bash
npm run dev
```
- **Frontend (Vite)**: `http://localhost:5173` (con proxy automático hacia `/api`)
- **Backend API (Express + SQLite)**: `http://localhost:3000`

---

## ✨ Funcionalidades del Dashboard

- **KPIs en tiempo real**:
  - Total gastado en el mes y comparativa vs mes anterior.
  - Categoría con mayor gasto (porcentaje e importe).
  - Total anual acumulado y media mensual.
  - Gasto diario promedio y conteo de movimientos.
  - Barra de presupuesto mensual objetivo con avisos de color.
- **Gráficos interactivos**:
  - **Gráfico Donut**: Distribución de gastos por categoría del periodo seleccionado con leyenda interactiva.
  - **Gráfico de Evolución Anual**: 12 meses (Enero a Diciembre) con selector de vista de **Barras** y **Línea**.
- **Formulario de Ingreso Rápido**:
  - Importe con atajos (+5€, +10€, +20€, +50€, +100€).
  - Categorías visuales (*Vivienda*, *Alimentación*, *Transporte*, *Ocio*, *Salud*, *Educación*, *Otros*).
  - Selector de fecha con atajos "Hoy" y "Ayer".
  - Métodos de pago (*Tarjeta*, *Efectivo*, *Bizum*, *Transferencia*).
- **Historial de Movimientos**:
  - Búsqueda en tiempo real, filtro por categoría y ordenación.
  - Edición y borrado directo en SQLite con confirmación y acción **"Deshacer"**.
  - Exportación a **CSV (Excel)** y **JSON**.

---

## 🛠️ Stack Tecnológico

- **Backend**: Node.js, Express, `better-sqlite3`, JWT, BcryptJS, TypeScript (`tsx`).
- **Base de Datos**: SQLite (`data/database.sqlite` con WAL mode).
- **Frontend**: React 19, TypeScript, Vite, Chart.js (`react-chartjs-2`), Lucide Icons.
- **Contenedores**: Docker (Multi-stage build) & Docker Compose.
