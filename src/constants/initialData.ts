import type { Expense } from '../types/expense';

export const generateSampleExpenses = (): Expense[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // Format helper YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number) => {
    const y = year.toString();
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const sampleList: Array<Omit<Expense, 'id' | 'createdAt'>> = [
    // Current Month expenses
    {
      amount: 750.00,
      date: formatDate(currentYear, currentMonth, 1),
      categoryId: 'vivienda',
      description: 'Alquiler mensual vivienda',
      paymentMethod: 'transferencia',
    },
    {
      amount: 62.40,
      date: formatDate(currentYear, currentMonth, 3),
      categoryId: 'vivienda',
      description: 'Factura de luz y electricidad',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 124.50,
      date: formatDate(currentYear, currentMonth, 4),
      categoryId: 'alimentacion',
      description: 'Compra quincenal en Mercadona',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 45.00,
      date: formatDate(currentYear, currentMonth, 6),
      categoryId: 'transporte',
      description: 'Abono transporte público mensual',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 32.80,
      date: formatDate(currentYear, currentMonth, 8),
      categoryId: 'ocio',
      description: 'Cena con amigos en restaurante',
      paymentMethod: 'bizum',
    },
    {
      amount: 89.90,
      date: formatDate(currentYear, currentMonth, 11),
      categoryId: 'alimentacion',
      description: 'Compra semanal fruta y frescos',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 55.00,
      date: formatDate(currentYear, currentMonth, 14),
      categoryId: 'transporte',
      description: 'Llenado depósito gasolina',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 17.99,
      date: formatDate(currentYear, currentMonth, 16),
      categoryId: 'ocio',
      description: 'Suscripción Netflix & Spotify',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 28.50,
      date: formatDate(currentYear, currentMonth, 18),
      categoryId: 'salud',
      description: 'Farmacia y vitaminas',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 49.00,
      date: formatDate(currentYear, currentMonth, 20),
      categoryId: 'educacion',
      description: 'Curso online de desarrollo frontend',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 112.30,
      date: formatDate(currentYear, currentMonth, 22),
      categoryId: 'alimentacion',
      description: 'Compra supermercado Carrefour',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 39.95,
      date: formatDate(currentYear, currentMonth, 24),
      categoryId: 'otros',
      description: 'Pack organización para el hogar',
      paymentMethod: 'tarjeta',
    },
    {
      amount: 18.50,
      date: formatDate(currentYear, currentMonth, 26),
      categoryId: 'ocio',
      description: 'Entradas de cine y palomitas',
      paymentMethod: 'tarjeta',
    },
  ];

  // Also add some expenses for previous months of this year so the yearly chart looks complete and realistic
  for (let m = 0; m < 12; m++) {
    if (m === currentMonth) continue; // already added above
    const isPastMonth = m < currentMonth;
    const factor = isPastMonth ? 0.85 + (m % 4) * 0.1 : 0.75 + (m % 3) * 0.12;

    sampleList.push({
      amount: 750.00,
      date: formatDate(currentYear, m, 1),
      categoryId: 'vivienda',
      description: 'Alquiler mensual vivienda',
      paymentMethod: 'transferencia',
    });
    sampleList.push({
      amount: Number((320 * factor).toFixed(2)),
      date: formatDate(currentYear, m, 8),
      categoryId: 'alimentacion',
      description: 'Supermercado y alimentación mensual',
      paymentMethod: 'tarjeta',
    });
    sampleList.push({
      amount: Number((95 * factor).toFixed(2)),
      date: formatDate(currentYear, m, 15),
      categoryId: 'transporte',
      description: 'Combustible y desplazamientos',
      paymentMethod: 'tarjeta',
    });
    sampleList.push({
      amount: Number((130 * factor).toFixed(2)),
      date: formatDate(currentYear, m, 20),
      categoryId: 'ocio',
      description: 'Actividades de fin de semana y cenas',
      paymentMethod: 'bizum',
    });
    sampleList.push({
      amount: Number((65 * factor).toFixed(2)),
      date: formatDate(currentYear, m, 25),
      categoryId: 'vivienda',
      description: 'Suministros del hogar',
      paymentMethod: 'tarjeta',
    });
    if (m % 2 === 0) {
      sampleList.push({
        amount: Number((45 * factor).toFixed(2)),
        date: formatDate(currentYear, m, 12),
        categoryId: 'salud',
        description: 'Cuidado personal y farmacia',
        paymentMethod: 'tarjeta',
      });
    }
  }

  // Generate unique IDs and timestamps
  return sampleList.map((item, index) => ({
    ...item,
    id: `exp-${Date.now() - index * 60000}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: Date.now() - index * 60000,
  }));
};
