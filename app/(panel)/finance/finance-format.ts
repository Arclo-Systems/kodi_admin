import type { FinanceAccount, FinanceKind, MovementType } from '@/hooks/use-finance';

// Etiquetas y formato de presentación de finanzas. Viven acá y no en el hook para
// que la capa de datos no cargue con el copy, y para que la tabla, el formulario y
// el manager de categorías muestren una cuenta exactamente igual.

export const KIND_LABELS: Record<FinanceKind, string> = { expense: 'Gasto', income: 'Ingreso' };

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  PARTNER_CONTRIBUTION: 'Aporte de socio',
  PARTNER_LOAN: 'Préstamo de socio',
  OTHER: 'Otro',
};

export const accountLabel = (a: FinanceAccount): string => `${a.code} ${a.name}`;
