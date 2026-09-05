import type {
  AccountType,
  FinanceAccount,
  FinanceKind,
  JournalEntryStatus,
  MovementType,
} from '@/hooks/use-finance';

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

// Clase contable de la cuenta. Es lo que decide el signo de su saldo, así que se
// nombra en la tabla y no se deduce del primer dígito del código.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  INCOME: 'Ingreso',
  COST_OF_REVENUE: 'Costo de ingresos',
  OPERATING_EXPENSE: 'Gasto operativo',
};

export const ACCOUNT_STATUS_LABELS = { active: 'Activa', inactive: 'Retirada' } as const;

// Mismas etiquetas que el CSV del backend: el asiento reversado sigue en el mayor
// (él y su reverso se cancelan), así que el estado explica, no filtra.
export const JOURNAL_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  POSTED: 'Vigente',
  VOID: 'Anulado',
  REVERSED: 'Reversado',
};

// Espacio duro (el separador de miles de es-CR): evita que el monto se parta en
// dos líneas dentro de una celda angosta.
const THOUSANDS_SEPARATOR = ' ';

/**
 * `'1234.56'` → `'1 234,56'`. Formatea el string tal cual llega, sin pasarlo por
 * `Number`: el backend ya lo serializó con dos decimales fijos y convertirlo a
 * double para agruparlo lo expone al redondeo justo en la capa que solo pinta.
 */
export function formatMoney(amount: string): string {
  const negative = amount.startsWith('-');
  const [whole = '0', decimals = '00'] = (negative ? amount.slice(1) : amount).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return `${negative ? '-' : ''}${grouped},${decimals}`;
}

/** El mismo monto con su moneda, como se lee en una tabla: `'1 234,56 CRC'`. */
export const formatAmount = (amount: string, currency: string): string =>
  `${formatMoney(amount)} ${currency}`;
