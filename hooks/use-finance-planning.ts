'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { sendFinanceRequest, type AccountType } from './use-finance';

// Planeamiento financiero (Fase 4): presupuesto, variación, runway, proyección,
// KPIs y alertas. Vive aparte de `use-finance.ts` por el mismo motivo que el
// controller del backend está partido: son dos responsabilidades distintas —el
// libro y el plan— y quince endpoints más dejarían el hook de contabilidad en un
// archivo donde no se encuentra nada.

const BASE = '/api/admin/finance';

// ─── N/A explícito ────────────────────────────────────────────────────────────
// La pieza central de toda la fase: cuando el número no existe viaja `null` con
// este objeto al lado. Nunca 0, nunca ∞, nunca un guión mudo.
export type NaReason =
  | 'SIN_DATOS'
  | 'HISTORIAL_INSUFICIENTE'
  | 'SIN_QUEMA_NETA'
  | 'SIN_CAJA'
  | 'SERIE_CONSTANTE'
  | 'PRESUPUESTO_EN_CERO'
  | 'SIN_ACTIVOS'
  | 'SIN_ACTIVOS_AL_INICIO'
  | 'SIN_CHURN_MEDIBLE'
  | 'SIN_GASTO_DE_MARKETING'
  | 'SIN_ALTAS'
  | 'SIN_PRECIOS_DE_LISTA'
  | 'CUENTA_AUSENTE';

/** El motivo viaja con su mensaje en español: el panel no traduce códigos. */
export type NotAvailable = { reason: NaReason; message: string };

/**
 * En qué está expresado el `value`. Sin esto `"0.0500"` es ambiguo: puede ser un
 * churn del 5 % o cinco céntimos.
 */
export type MetricUnit = 'money' | 'count' | 'ratio' | 'percent' | 'months';

/** `value === null` ⟺ `na !== null`. Nunca los dos, nunca ninguno. */
export type Metric = {
  value: string | null;
  unit: MetricUnit;
  label: string;
  na: NotAvailable | null;
};

// ─── Presupuesto ──────────────────────────────────────────────────────────────
export const BUDGET_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/** Las tres clases sobre las que se presupuesta: un activo no se presupuesta, se tiene. */
export const RESULT_ACCOUNT_TYPES = [
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
] as const satisfies readonly AccountType[];
export type ResultAccountType = (typeof RESULT_ACCOUNT_TYPES)[number];

export type BudgetSummary = {
  id: string;
  year: number;
  month: number;
  /** `YYYY-MM`. */
  period: string;
  currency: string;
  name: string;
  status: BudgetStatus;
  lineCount: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetLine = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  amount: string;
};

export type BudgetDetail = BudgetSummary & {
  lines: BudgetLine[];
  /** Las tres claves viajan siempre, también en cero. */
  totalsByType: Record<ResultAccountType, string>;
};

export type BudgetListQuery = {
  year?: number;
  month?: number;
  currency?: string;
  status?: BudgetStatus;
  page: number;
  pageSize: number;
};

export type BudgetPage = {
  items: BudgetSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type BudgetInput = {
  year: number;
  month: number;
  currency: string;
  name: string;
  status?: Exclude<BudgetStatus, 'ARCHIVED'>;
};

export type BudgetUpdate = { name?: string; status?: BudgetStatus };

// ─── Variación ────────────────────────────────────────────────────────────────
export type VarianceComparison = {
  budget: string;
  actual: string;
  /** `real − presupuesto`, con signo. */
  variance: string;
  variancePercent: Metric;
  /**
   * No se deduce del signo: en un ingreso cobrar de más es bueno y en un gasto
   * es lo contrario, así que dos filas con la misma variación pueden significar
   * cosas opuestas.
   */
  favorable: boolean;
};

export type BudgetVarianceLine = VarianceComparison & {
  /** `null` en las cuentas que se movieron SIN estar presupuestadas. */
  accountId: string | null;
  code: string;
  name: string;
  type: AccountType;
};

export type BudgetVariance = {
  period: string;
  year: number;
  month: number;
  currency: string;
  budget: { id: string; name: string; status: BudgetStatus };
  lines: BudgetVarianceLine[];
  totalsByType: (VarianceComparison & { type: ResultAccountType })[];
  net: VarianceComparison;
};

// ─── Runway ───────────────────────────────────────────────────────────────────
export type Runway = {
  currency: string;
  asOf: string;
  cashBalance: string;
  burn: {
    months: { month: string; burn: string }[];
    /** `null` cuando no hay meses suficientes para promediar. */
    average: string | null;
    basisMonths: number;
  };
  /** Meses de pista, un decimal. `null` ⟺ `na` no es null. */
  runwayMonths: string | null;
  na: NotAvailable | null;
};

// ─── Proyección ───────────────────────────────────────────────────────────────
export const FORECAST_HORIZONS = ['3', '6', '12'] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export type ForecastPoint = {
  month: string;
  income: string;
  expense: string;
  net: string;
  isProjection: boolean;
  /** La recta cayó por debajo de cero. No se recorta: se marca. */
  negativeProjection: boolean;
};

export type SeriesFit = {
  slope: string;
  intercept: string;
  /** `null` con serie constante: el R² sería 0/0, no 1. */
  r2: string | null;
  r2Na: NotAvailable | null;
};

export type Forecast = {
  currency: string;
  method: 'linear';
  /** "Proyección, no dato": la advertencia viaja con los números. */
  label: string;
  horizon: number;
  basisMonths: number;
  history: ForecastPoint[];
  projection: ForecastPoint[];
  fit: { income: SeriesFit; expense: SeriesFit } | null;
  na: NotAvailable | null;
};

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const KPI_METRIC_KEYS = [
  'subscriptionRevenue',
  'mrrEstimated',
  'arrFromRevenue',
  'marketingSpend',
  'activeSubscriptions',
  'activeAtMonthStart',
  'newSubscriptions',
  'churnedSubscriptions',
  // Filas, no clientes: un mismo cliente puede tener varios módulos. Va aparte de
  // los cuatro conteos de clientes justamente para que no se lean como lo mismo.
  'moduleSubscriptions',
  'churnRate',
  'arpu',
  'ltv',
  'cac',
] as const;
export type KpiMetricKey = (typeof KPI_METRIC_KEYS)[number];

export type FinanceKpis = {
  currency: string;
  period: string;
  year: number;
  month: number;
  /** El mes no terminó: las cifras van a seguir subiendo. */
  isCurrentMonth: boolean;
  range: { from: string; to: string };
  metrics: Record<KpiMetricKey, Metric>;
};

// ─── Alertas ──────────────────────────────────────────────────────────────────
export const ALERT_KINDS = [
  'RUNWAY_BELOW_MONTHS',
  'BUDGET_OVERRUN_PERCENT',
  'UNPOSTED_PLAY_ORDERS',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export type ThresholdUnit = 'months' | 'percent' | 'count';

export type FinanceAlertRule = {
  id: string;
  kind: AlertKind;
  threshold: string;
  thresholdUnit: ThresholdUnit;
  /** Obligatoria en las reglas de plata, `null` en la que cuenta órdenes. */
  currency: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceAlert = {
  id: string;
  ruleId: string;
  kind: AlertKind;
  currency: string | null;
  threshold: string;
  /** Día civil de Costa Rica, `YYYY-MM-DD`. */
  firedOn: string;
  firedAt: string;
  message: string;
  context: Record<string, unknown>;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

export type AlertRuleInput = {
  kind: AlertKind;
  threshold: string;
  currency?: string;
  isActive?: boolean;
};

/** `kind` no está: es inmutable y mandarlo devuelve 409. */
export type AlertRuleUpdate = {
  threshold?: string;
  currency?: string | null;
  isActive?: boolean;
};

export type AlertRulePage = {
  items: FinanceAlertRule[];
  total: number;
  page: number;
  pageSize: number;
};

export type AlertPage = {
  items: FinanceAlert[];
  total: number;
  page: number;
  pageSize: number;
};

export type AlertEvaluation = {
  evaluatedOn: string;
  evaluated: number;
  fired: number;
  /** Disparos que ya tenían su alerta del día: el dedupe funcionando. */
  deduped: number;
  /** Reglas que NO pudieron decidir. No es un error, pero hay que mostrarlo. */
  skipped: { ruleId: string; kind: AlertKind; reason: string }[];
};

// ─── Query strings ────────────────────────────────────────────────────────────
type Params = Record<string, string | number | boolean | undefined>;

function qs(params: Params): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    search.set(k, String(v));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

// ─── Presupuesto ──────────────────────────────────────────────────────────────
export function useBudgets(query: BudgetListQuery) {
  return useQuery({
    queryKey: ['finance-budgets', query],
    // Sin esto la tabla se vacía en cada cambio de página.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<BudgetPage> =>
      (await fetchJson<BudgetPage>(`${BASE}/budgets${qs({ ...query })}`)) ?? {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      },
  });
}

export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: ['finance-budget', id ?? null],
    enabled: !!id,
    queryFn: async (): Promise<BudgetDetail | undefined> =>
      fetchJson<BudgetDetail>(`${BASE}/budgets/${id}`),
  });
}

/**
 * Toda mutación de un presupuesto cambia la lista, su detalle y la variación del
 * período: refrescar solo la lista dejaría la comparación mostrando el
 * presupuesto anterior.
 */
function useInvalidateBudgets(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      ['finance-budgets', 'finance-budget', 'finance-budget-variance'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };
}

export function useBudgetMutations() {
  const invalidate = useInvalidateBudgets();
  return {
    create: useMutation({
      mutationFn: (input: BudgetInput) => sendFinanceRequest(`${BASE}/budgets`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: BudgetUpdate }) =>
        sendFinanceRequest(`${BASE}/budgets/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    // Reemplazo TOTAL, no parche: lo que viaja es el presupuesto completo, con
    // los montos como string.
    replaceLines: useMutation({
      mutationFn: ({ id, lines }: { id: string; lines: { accountId: string; amount: string }[] }) =>
        sendFinanceRequest(`${BASE}/budgets/${id}/lines`, 'PUT', { lines }),
      onSuccess: invalidate,
    }),
    copyFrom: useMutation({
      mutationFn: ({ id, sourceId }: { id: string; sourceId: string }) =>
        sendFinanceRequest(`${BASE}/budgets/${id}/copy-from?source=${sourceId}`, 'POST'),
      onSuccess: invalidate,
    }),
    // Un presupuesto no se borra: archivarlo deja la variación de un mes pasado
    // dando lo mismo dentro de un año. Es reversible con `update`.
    archive: useMutation({
      mutationFn: (id: string) => sendFinanceRequest(`${BASE}/budgets/${id}/archive`, 'POST'),
      onSuccess: invalidate,
    }),
  };
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
/** Los tres parámetros son obligatorios: sin ellos el backend responde 400. */
export function useBudgetVariance(params: { year?: number; month?: number; currency?: string }) {
  return useQuery({
    queryKey: ['finance-budget-variance', params],
    enabled: !!params.year && !!params.month && !!params.currency,
    queryFn: async (): Promise<BudgetVariance | undefined> =>
      fetchJson<BudgetVariance>(`${BASE}/reports/budget-variance${qs({ ...params })}`),
  });
}

export function useRunway(currency: string | undefined) {
  return useQuery({
    queryKey: ['finance-runway', currency ?? null],
    enabled: !!currency,
    queryFn: async (): Promise<Runway | undefined> =>
      fetchJson<Runway>(`${BASE}/reports/runway${qs({ currency })}`),
  });
}

export function useForecast(params: { currency?: string; horizon: ForecastHorizon }) {
  return useQuery({
    queryKey: ['finance-forecast', params],
    enabled: !!params.currency,
    queryFn: async (): Promise<Forecast | undefined> =>
      fetchJson<Forecast>(`${BASE}/reports/forecast${qs({ ...params })}`),
  });
}

/**
 * `year` y `month` van juntos o no van: mandar uno solo es 400. Sin ninguno el
 * reporte mira el mes en curso, que es un mes incompleto a propósito.
 */
export function useFinanceKpis(params: { currency?: string; year?: number; month?: number }) {
  const complete = params.year !== undefined && params.month !== undefined;
  const period: { year?: number; month?: number } = complete
    ? { year: params.year, month: params.month }
    : {};
  return useQuery({
    queryKey: ['finance-kpis', params.currency ?? null, period],
    enabled: !!params.currency,
    queryFn: async (): Promise<FinanceKpis | undefined> =>
      fetchJson<FinanceKpis>(`${BASE}/reports/kpis${qs({ currency: params.currency, ...period })}`),
  });
}

// ─── Alertas ──────────────────────────────────────────────────────────────────
export function useFinanceAlertRules(query: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['finance-alert-rules', query],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AlertRulePage> =>
      (await fetchJson<AlertRulePage>(`${BASE}/alert-rules${qs({ ...query })}`)) ?? {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      },
  });
}

/**
 * Una regla y sus disparos son la misma pantalla: crear, apagar o borrar una
 * cambia lo que la lista de alertas puede mostrar (borrar se lleva el historial
 * por cascade), y el banner del índice cuenta lo mismo.
 */
function useInvalidateAlerts(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      ['finance-alert-rules', 'finance-alerts', 'finance-alerts-unseen'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };
}

export function useFinanceAlertRuleMutations() {
  const invalidate = useInvalidateAlerts();
  return {
    create: useMutation({
      mutationFn: (input: AlertRuleInput) =>
        sendFinanceRequest(`${BASE}/alert-rules`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: AlertRuleUpdate }) =>
        sendFinanceRequest(`${BASE}/alert-rules/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    // Se lleva el historial de disparos (cascade). Para conservarlo, `isActive: false`.
    remove: useMutation({
      mutationFn: (id: string) => sendFinanceRequest(`${BASE}/alert-rules/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

export function useFinanceAlerts(query: {
  acknowledged?: boolean;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ['finance-alerts', query],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AlertPage> =>
      (await fetchJson<AlertPage>(`${BASE}/alerts${qs({ ...query })}`)) ?? {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      },
  });
}

/**
 * Cuántas alertas nadie miró todavía. Pide UNA fila y lee `total`: el banner del
 * índice solo necesita el número, igual que el semáforo de Play solo necesita
 * los conteos.
 */
export function useUnseenFinanceAlerts() {
  const query = useQuery({
    queryKey: ['finance-alerts-unseen'],
    queryFn: async (): Promise<AlertPage | undefined> =>
      fetchJson<AlertPage>(`${BASE}/alerts${qs({ acknowledged: false, page: 1, pageSize: 1 })}`),
  });
  return {
    // Un conteo que no llegó no es un cero: sin esto el banner desaparecería
    // justo cuando el endpoint está caído.
    isError: query.isError,
    isLoading: query.isLoading,
    count: query.data?.total,
  };
}

export function useFinanceAlertActions() {
  const invalidate = useInvalidateAlerts();
  return {
    // Idempotente: el segundo clic devuelve el sello del primero.
    acknowledge: useMutation({
      mutationFn: (id: string) => sendFinanceRequest(`${BASE}/alerts/${id}/acknowledge`, 'POST'),
      onSuccess: invalidate,
    }),
    evaluate: useMutation({
      mutationFn: async (): Promise<AlertEvaluation | undefined> => {
        const body = await sendFinanceRequest(`${BASE}/alerts/evaluate`, 'POST');
        return (body as { data?: AlertEvaluation } | undefined)?.data;
      },
      onSuccess: invalidate,
    }),
  };
}
