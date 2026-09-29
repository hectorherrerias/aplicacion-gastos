import type { CategoryId, CategoryInfo } from '../types/expense';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'vivienda',
    name: 'Vivienda',
    icon: 'Home',
    color: '#0284c7', // Sky Blue
    bgColor: '#e0f2fe',
    borderColor: '#bae6fd',
    description: 'Alquiler, hipoteca, suministros (luz, agua, gas, internet)',
  },
  {
    id: 'alimentacion',
    name: 'Alimentación',
    icon: 'Utensils',
    color: '#059669', // Emerald
    bgColor: '#d1fae5',
    borderColor: '#a7f3d0',
    description: 'Supermercado, restaurantes, cafeterías y delivery',
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: 'Car',
    color: '#d97706', // Amber / Orange
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    description: 'Combustible, transporte público, parking y mantenimiento',
  },
  {
    id: 'ocio',
    name: 'Ocio',
    icon: 'Film',
    color: '#8b5cf6', // Purple
    bgColor: '#ede9fe',
    borderColor: '#ddd6fe',
    description: 'Cine, conciertos, streaming, viajes y salidas',
  },
  {
    id: 'salud',
    name: 'Salud',
    icon: 'HeartPulse',
    color: '#e11d48', // Rose / Red
    bgColor: '#ffe4e6',
    borderColor: '#fecdd3',
    description: 'Farmacia, médicos, gimnasio, cuidado personal',
  },
  {
    id: 'educacion',
    name: 'Educación',
    icon: 'GraduationCap',
    color: '#4f46e5', // Indigo
    bgColor: '#e0e7ff',
    borderColor: '#c7d2fe',
    description: 'Cursos, libros, software formativo y matrículas',
  },
  {
    id: 'otros',
    name: 'Otros',
    icon: 'Package',
    color: '#64748b', // Slate
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    description: 'Compras varias, imprevistos y regalos',
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryId, CategoryInfo>
);

export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTH_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
