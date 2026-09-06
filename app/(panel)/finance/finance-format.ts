import type { LucideIcon } from 'lucide-react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  ClockIcon,
  EyeIcon,
  LockIcon,
  LockOpenIcon,
  PencilLineIcon,
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
import type {
  AlertKind,
  BudgetStatus,
  KpiMetricKey,
  Metric as PlanningMetric,
  ThresholdUnit,
} from '@/hooks/use-finance-planning';
import type {
  PackageFile,
  PackageStatus,
  PeriodStatus,
  TaxAppliesTo,
  TaxDeclarationStatus,
} from '@/hooks/use-finance-tax';
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

// El importe TAL COMO SE TECLEA en un formulario: hasta 12 enteros y 0-2
// decimales, sin signo. Es el mismo criterio que `zMoney()` en el backend, y es
// más laxo que `BACKEND_AMOUNT` porque nadie escribe los dos decimales siempre.
const FORM_AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * Suma importes tecleados, en céntimos enteros: `['0.1', '0.2']` → `'0.30'`.
 *
 * Los vacíos no suman —no presupuestar una cuenta no es presupuestarla en cero—
 * y un solo importe malformado devuelve `null` en vez de sumar los demás: un
 * subtotal que ignora en silencio lo que no supo leer es más bajo que el real y
 * nadie ve por qué.
 */
export function sumMoney(amounts: readonly string[]): string | null {
  let total = ZERO;
  for (const raw of amounts) {
    if (raw === '') continue;
    if (!FORM_AMOUNT.test(raw)) return null;
    const [whole = '0', decimals = ''] = raw.split('.');
    total += BigInt(whole) * CENTS_PER_UNIT + BigInt(decimals.padEnd(2, '0'));
  }
  return fromCents(total);
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
  // "Sin asentar" y "Sin asiento" decían casi lo mismo para dos estados
  // opuestos: uno hay que arreglarlo, el otro es un final correcto.
  FAILED: 'Falló',
  SKIPPED: 'Omitida',
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

// ─── Planeamiento: presupuesto, KPIs, proyección y alertas ────────────────────

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Vigente',
  // No es "borrado": la variación de un mes pasado tiene que seguir dando lo
  // mismo dentro de un año, así que el presupuesto se guarda y se desarchiva.
  ARCHIVED: 'Archivado',
};

export const BUDGET_STATUS_TONE: Record<BudgetStatus, StatusTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  RUNWAY_BELOW_MONTHS: 'Pista de caja por debajo de',
  BUDGET_OVERRUN_PERCENT: 'Gasto sobre el presupuesto en más de',
  UNPOSTED_PLAY_ORDERS: 'Órdenes de Play sin asentar por encima de',
};

// Qué mira cada regla, en una línea: sin esto el umbral es un número suelto y
// nadie sabe si "3" son meses, por ciento u órdenes.
export const ALERT_KIND_HINTS: Record<AlertKind, string> = {
  RUNWAY_BELOW_MONTHS:
    'Saldo de caja ÷ quema promedio de los 3 últimos meses completos, en la moneda de la regla.',
  BUDGET_OVERRUN_PERCENT:
    'Gasto real agregado del mes en curso contra el presupuesto vigente de ese mes y moneda.',
  UNPOSTED_PLAY_ORDERS: 'Órdenes con plata cobrada y sin asiento. No lleva moneda: cuenta filas.',
};

export const THRESHOLD_UNIT_LABELS: Record<ThresholdUnit, string> = {
  months: 'meses',
  percent: '%',
  count: 'órdenes',
};

/**
 * El nombre corto de cada KPI en la tarjeta. La explicación larga NO se escribe
 * acá: es el `label` que manda el backend, que viaja con el número y se muestra
 * debajo. Así el título es leíble de un vistazo y la definición no puede quedar
 * desfasada de la fórmula.
 *
 * Los dos primeros tienen nombres deliberadamente distintos: son dos números de
 * dos cosas distintas (caja cobrada contra precio de lista × activas) y llamar a
 * los dos "MRR" haría pensar que uno está mal.
 */
export const KPI_TITLES: Record<KpiMetricKey, string> = {
  subscriptionRevenue: 'Ingresos por suscripciones del mes (caja real)',
  mrrEstimated: 'MRR estimado (precio de lista × activas)',
  arrFromRevenue: 'ARR desde ingresos (× 12)',
  marketingSpend: 'Gasto de marketing del mes',
  activeSubscriptions: 'Clientes activos al cierre',
  activeAtMonthStart: 'Clientes activos al arrancar el mes',
  newSubscriptions: 'Altas del mes',
  churnedSubscriptions: 'Bajas del mes',
  moduleSubscriptions: 'Módulos suscritos vigentes',
  churnRate: 'Churn del mes',
  arpu: 'ARPU',
  ltv: 'LTV',
  cac: 'CAC',
};

/** `'2026-09'` → `'09/2026'`. Sin `new Date`: correría el mes en cualquier zona al oeste de UTC. */
export const formatPeriod = (period: string): string =>
  `${period.slice(5)}/${period.slice(0, 4)}`;

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** 1-12 → nombre del mes en es-CR ("Setiembre", no "Septiembre"). */
export const monthName = (month: number): string => MONTH_NAMES[month - 1] ?? String(month);

export const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));

/**
 * `'0.0500'` → `'5.00'`. Corre la coma dos lugares sobre el STRING, sin pasar por
 * `Number`: el backend manda la fracción con cuatro decimales fijos y
 * multiplicarla por 100 en double la devolvería como `5.000000000000001`.
 */
export function ratioToPercent(ratio: string): string {
  const negative = ratio.startsWith('-');
  const [whole = '0', decimals = ''] = (negative ? ratio.slice(1) : ratio).split('.');
  const padded = decimals.padEnd(4, '0');
  const shiftedWhole = `${whole}${padded.slice(0, 2)}`.replace(/^0+(?=\d)/, '');
  const shiftedDecimals = padded.slice(2, 4).padEnd(2, '0');
  return `${negative ? '-' : ''}${shiftedWhole}.${shiftedDecimals}`;
}

/** Entero agrupado en miles: `'1234'` → `'1 234'`. Un conteo no lleva decimales. */
export const formatCount = (value: string): string =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);

/**
 * Cómo se lee el `value` de una métrica según su `unit`.
 *
 * La unidad viene del backend a propósito: los importes viajan como string y sin
 * ella `"0.0500"` es tan válido como cinco céntimos o como un churn del 5 %.
 * Devuelve `null` cuando la métrica es N/A — quién la pinta decide cómo mostrar
 * el motivo, pero nunca puede caer en un cero.
 */
export function formatMetricValue(metric: PlanningMetric, currency: string): string | null {
  if (metric.value === null) return null;
  switch (metric.unit) {
    case 'money':
      return formatAmount(metric.value, currency);
    case 'count':
      return formatCount(metric.value);
    case 'ratio':
      return `${formatMoney(ratioToPercent(metric.value))} %`;
    case 'percent':
      return `${formatMoney(metric.value)} %`;
    case 'months':
      return `${formatMoney(metric.value)} meses`;
  }
}

// El mismo tono del badge, como color de texto: lo usan el conteo del semáforo y
// la explicación del detalle. Sin esto un `UNSUPPORTED_CURRENCY` —que es una
// advertencia— se pintaba con el rojo de un fallo.
export const STATUS_TONE_TEXT: Record<StatusTone, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
  neutral: 'text-foreground',
};

// ─── Impuestos, cierre mensual y paquete del contador ─────────────────────────

// A qué se le aplica la tarifa. Es parte de la llave y no se puede cambiar
// después: por eso el formulario lo pide al crear y lo muestra al editar.
export const TAX_APPLIES_TO_LABELS: Record<TaxAppliesTo, string> = {
  GENERAL: 'General',
  SPONSOR_INVOICE: 'Facturas de sponsor',
  SUBSCRIPTION: 'Suscripciones',
};

// Qué usa cada ámbito, en una línea: sin esto "General" no dice si alguien la lee.
export const TAX_APPLIES_TO_HINTS: Record<TaxAppliesTo, string> = {
  GENERAL: 'La tarifa de referencia. No la consume ningún cálculo automático todavía.',
  SPONSOR_INVOICE:
    'La que usa la factura de sponsor por su fecha de emisión. Sin una vigente, facturar responde 409.',
  SUBSCRIPTION: 'Reservada para las suscripciones. Todavía no la consume ningún cálculo.',
};

export const TAX_DECLARATION_STATUS_LABELS: Record<TaxDeclarationStatus, string> = {
  DRAFT: 'Borrador',
  REVIEW: 'En revisión',
  FILED: 'Presentada',
  CLOSED: 'Cerrada',
};

// Qué significa estar en cada estado y qué se puede hacer ahí. El botón de
// transición dice a dónde va; esto dice dónde está.
export const TAX_DECLARATION_STATUS_HINTS: Record<TaxDeclarationStatus, string> = {
  DRAFT: 'Se puede recalcular contra el mayor las veces que haga falta.',
  REVIEW: 'Se sigue pudiendo recalcular, y volver a borrador si aparece un error.',
  FILED: 'Presentada ante Hacienda por fuera del sistema. Ya no se recalcula.',
  CLOSED: 'Terminal e inmutable: no admite ninguna transición más.',
};

export const TAX_DECLARATION_STATUS_BADGE: Record<
  TaxDeclarationStatus,
  { tone: StatusTone; icon: LucideIcon }
> = {
  DRAFT: { tone: 'neutral', icon: PencilLineIcon },
  REVIEW: { tone: 'info', icon: EyeIcon },
  FILED: { tone: 'success', icon: CircleCheckIcon },
  CLOSED: { tone: 'muted', icon: LockIcon },
};

/**
 * El texto del botón que lleva a cada estado. Dice el VERBO y el destino, no el
 * nombre del estado: "REVIEW" en un botón no explica qué va a pasar al apretarlo.
 */
export const TAX_DECLARATION_TRANSITION_LABELS: Record<TaxDeclarationStatus, string> = {
  DRAFT: 'Volver a borrador',
  REVIEW: 'Pasar a revisión',
  FILED: 'Marcar presentada',
  CLOSED: 'Cerrar declaración',
};

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
};

export const PERIOD_STATUS_BADGE: Record<PeriodStatus, { tone: StatusTone; icon: LucideIcon }> = {
  OPEN: { tone: 'info', icon: LockOpenIcon },
  CLOSED: { tone: 'success', icon: LockIcon },
};

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  GENERATING: 'Generando',
  READY: 'Listo',
  FAILED: 'Falló',
  // No es "borrado": la fila queda con su número de versión, que no se reusa.
  DISCARDED: 'Descartado',
};

export const PACKAGE_STATUS_BADGE: Record<
  PackageStatus,
  { tone: StatusTone; icon: LucideIcon }
> = {
  GENERATING: { tone: 'neutral', icon: ClockIcon },
  READY: { tone: 'success', icon: CircleCheckIcon },
  FAILED: { tone: 'destructive', icon: CircleAlertIcon },
  DISCARDED: { tone: 'muted', icon: CircleSlashIcon },
};

/** El nombre con el que se ofrece cada archivo del paquete, no su key en R2. */
export const PACKAGE_FILE_LABELS: Record<PackageFile, string> = {
  pdf: 'PDF completo',
  'mayor.csv': 'Mayor (CSV)',
  'comprobacion.csv': 'Comprobación (CSV)',
  'balance.csv': 'Balance general (CSV)',
  'resultados.csv': 'Resultados (CSV)',
};

/**
 * `'0.1300'` → `'13,00 %'`. Pasa por `ratioToPercent`, que corre la coma sobre el
 * STRING: la tarifa llega como fracción con cuatro decimales y multiplicarla por
 * 100 en double devolvería `13.000000000000002`.
 */
export const formatRate = (rate: string): string => `${formatMoney(ratioToPercent(rate))} %`;

/** `'2026-09-01'` → `'2026-09'`. La vigencia se lee por día, el período por mes. */
export const periodOfDate = (date: string): string => date.slice(0, 7);

const KIB = 1024;

/**
 * Tamaño de un archivo del paquete, para que se vea si el PDF pesa 180 KB o 18 MB
 * antes de pedir el enlace. `bytes` es un conteo, no plata: acá `Number` es
 * legítimo y el redondeo no le cuesta un céntimo a nadie.
 */
export function formatBytes(bytes: number): string {
  if (bytes < KIB) return `${bytes} B`;
  const kb = bytes / KIB;
  if (kb < KIB) return `${kb.toFixed(1).replace('.', ',')} KB`;
  return `${(kb / KIB).toFixed(1).replace('.', ',')} MB`;
}

// El mismo tono del badge, como chip de icono de una stat card (fondo + texto).
// Es el par que le falta a `KpiTone` para poder expresar los seis estados de
// finanzas: `muted` y `neutral` se ven distinto y colapsarlos borraría la
// diferencia entre "no va a haber asiento" y "todavía no lo hay".
export const STATUS_TONE_CHIP: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  neutral: 'bg-primary/10 text-primary',
};
