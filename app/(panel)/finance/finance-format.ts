import type { LucideIcon } from 'lucide-react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  ClockIcon,
  EyeIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from 'lucide-react';
import type {
  AccountType,
  FinanceAccount,
  FinanceKind,
  JournalEntryStatus,
  MovementType,
  PlayOrderStatus,
} from '@/hooks/use-finance';
import type { StatusTone } from '@/lib/status-badge';

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

export const ACCOUNT_STATUS_LABELS = {
  active: 'Activa',
  inactive: 'Retirada',
  // Una hija sigue con `isActive: true` cuando se retira el padre, pero deja de
  // estar disponible: pintarla "Activa" a secas dice lo contrario de lo que pasa.
  inheritedInactive: 'Activa (padre retirado)',
} as const;

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

// ─── Aritmética de importes ───────────────────────────────────────────────────
// Los importes viajan como string con dos decimales fijos. Cuando hay que
// derivar uno (el bruto sin impuesto de una orden de Google no viene en la
// respuesta) la cuenta se hace en céntimos enteros: `Number('12.99')` reintroduce
// el double justo en la capa que solo pinta.
const BACKEND_AMOUNT = /^-?\d+\.\d{2}$/;
// `100n` no compila con `target: ES2017`; el constructor sí.
const CENTS_PER_UNIT = BigInt(100);
const ZERO = BigInt(0);

function toCents(amount: string): bigint | null {
  if (!BACKEND_AMOUNT.test(amount)) return null;
  const negative = amount.startsWith('-');
  const [whole = '0', decimals = '00'] = (negative ? amount.slice(1) : amount).split('.');
  const cents = BigInt(whole) * CENTS_PER_UNIT + BigInt(decimals);
  return negative ? -cents : cents;
}

function fromCents(cents: bigint): string {
  const negative = cents < ZERO;
  const abs = negative ? -cents : cents;
  const units = abs / CENTS_PER_UNIT;
  const remainder = String(abs % CENTS_PER_UNIT).padStart(2, '0');
  return `${negative ? '-' : ''}${units}.${remainder}`;
}

/**
 * `'12.99' − '1.69'` → `'11.30'`. `null` si alguno de los dos no tiene la forma
 * que serializa el backend: inventar un cero ahí sería inventar plata.
 */
export function subtractMoney(minuend: string, subtrahend: string): string | null {
  const a = toCents(minuend);
  const b = toCents(subtrahend);
  if (a === null || b === null) return null;
  return fromCents(a - b);
}

// ─── Órdenes de Google Play ───────────────────────────────────────────────────
// El estado no es decorativo: separa las órdenes que YA están en el libro de las
// que cobraron plata y todavía no, que son las únicas sobre las que hay algo que
// hacer. El tono lo dice antes que el texto.
export const PLAY_ORDER_STATUS_LABELS: Record<PlayOrderStatus, string> = {
  PENDING: 'Pendiente',
  POSTED: 'Asentada',
  UNSUPPORTED_CURRENCY: 'Moneda sin soporte',
  REVERSED: 'Reversada',
  FAILED: 'Sin asentar',
  SKIPPED: 'Sin asiento',
  NEEDS_REVIEW: 'Por revisar',
};

// Qué significa cada estado, en una línea: es lo que evita tener que abrir el
// detalle para entender por qué una orden no tiene asiento.
export const PLAY_ORDER_STATUS_HINTS: Record<PlayOrderStatus, string> = {
  PENDING: 'Ingestada; el cobro todavía no está confirmado en Google.',
  POSTED: 'Asentada en el libro mayor.',
  UNSUPPORTED_CURRENCY: 'Plata registrada sin asiento: falta esa moneda en la contabilidad.',
  REVERSED: 'Reembolsada: el asiento y su reversión están en el libro.',
  FAILED: 'El asiento no se pudo emitir. Hay que actuar.',
  SKIPPED: 'No hay asiento y no lo va a haber. No es un error.',
  NEEDS_REVIEW: 'Una persona tiene que decidir qué hacer con esta orden.',
};

export const PLAY_ORDER_STATUS_BADGE: Record<
  PlayOrderStatus,
  { tone: StatusTone; icon: LucideIcon }
> = {
  POSTED: { tone: 'success', icon: CircleCheckIcon },
  PENDING: { tone: 'neutral', icon: ClockIcon },
  FAILED: { tone: 'destructive', icon: CircleAlertIcon },
  NEEDS_REVIEW: { tone: 'destructive', icon: EyeIcon },
  UNSUPPORTED_CURRENCY: { tone: 'warning', icon: TriangleAlertIcon },
  REVERSED: { tone: 'muted', icon: Undo2Icon },
  SKIPPED: { tone: 'muted', icon: CircleSlashIcon },
};

/**
 * Link al mayor de una cuenta conservando lo que se venía mirando.
 *
 * La moneda y el rango viajan porque un mayor es el de UNA cuenta en UNA moneda:
 * abrirlo en los valores por defecto obligaría a re-elegir los tres filtros justo
 * después de haber encontrado la cuenta en la comprobación.
 */
export function ledgerHref(params: {
  accountId: string;
  currency: string;
  from?: string;
  to?: string;
}): string {
  const search = new URLSearchParams({
    accountId: params.accountId,
    currency: params.currency,
  });
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  return `/finance/mayor?${search}`;
}
