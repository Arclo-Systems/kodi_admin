'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwApiError, unwrapData } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';

export type FinanceKind = 'expense' | 'income';
export const FINANCE_CURRENCIES = ['CRC', 'USD'] as const;

// Naturaleza contable del hecho económico: decide contra qué cuentas se asienta
// el movimiento. Solo INCOME y EXPENSE mueven el P&L; una transferencia, un
// aporte o un préstamo de socio meten plata en la caja sin ser ingreso.
export const MOVEMENT_TYPES = [
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'PARTNER_CONTRIBUTION',
  'PARTNER_LOAN',
  'OTHER',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type FinanceEntryStatus = 'ACTIVE' | 'VOIDED';

export const ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'INCOME',
  'COST_OF_REVENUE',
  'OPERATING_EXPENSE',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type FinanceAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency: string | null; // null = la cuenta acepta cualquier moneda
  parentId: string | null;
  isActive: boolean;
  allowsManualEntry: boolean;
  // `true` = el CÓDIGO la resuelve por su `code` (4110, 5110, 1220, 1900…) para
  // asentar automáticamente. El panel la muestra pero no ofrece retirarla ni
  // colgarle subcuentas: el backend responde 409 ACCOUNT_IS_SYSTEM.
  isSystem: boolean;
  sortOrder: number;
  // Calculados sobre el plan COMPLETO: siguen siendo correctos con `postable=true`,
  // donde los padres no viajan en la respuesta.
  parentCode: string | null;
  depth: number;
};

export type FinanceAccountInput = {
  code: string;
  name: string;
  parentId: string;
  currency: string | null;
  allowsManualEntry: boolean;
};
// `code`, `type` y `parentId` no están: el backend responde 409
// ACCOUNT_FIELD_IMMUTABLE si viajan, porque cambiarlos reescribe el pasado.
export type FinanceAccountUpdate = {
  name?: string;
  currency?: string | null;
  isActive?: boolean;
  allowsManualEntry?: boolean;
};

export type FinanceCategory = {
  id: string;
  name: string;
  kind: FinanceKind;
  sortOrder: number;
  isActive: boolean;
  accountId: string | null;
};

export type FinanceEntry = {
  id: string;
  categoryId: string;
  categoryName: string;
  kind: FinanceKind;
  type: MovementType;
  status: FinanceEntryStatus;
  // String y no number: el backend serializa el Decimal con dos decimales fijos
  // y pasarlo por `number` reintroduce el double justo en el borde que la
  // validación de entrada acaba de proteger.
  amount: string;
  currency: string;
  date: string;
  accountId: string | null;
  counterAccountId: string | null;
  // Lo que LLEGÓ a la cuenta de destino cuando la transferencia cambió de moneda.
  // `null` en todo lo demás.
  counterAmount: string | null;
  journalEntryId: string | null; // null = histórico sin asiento (previo al backfill)
  // Los tres solo tienen valor con `status === 'VOIDED'`: son el descargo del
  // asiento de reversión (quién anuló, cuándo y por qué).
  voidedAt: string | null;
  voidedBy: string | null;
  // `users.displayName` del admin que anuló. Viaja null si ese admin ya no existe:
  // `voidedBy` (uuid suelto, sin FK) queda como último recurso para cruzarlo con
  // el audit log.
  voidedByName: string | null;
  voidReason: string | null;
  vendor: string | null;
  note: string | null;
  hasReceipt: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceEntryListQuery = {
  kind?: FinanceKind;
  categoryId?: string;
  currency?: string;
  type?: MovementType;
  status?: FinanceEntryStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

type EntryListPage = { items: FinanceEntry[]; total: number; page: number; pageSize: number };

// ─── Reportes del mayor ───────────────────────────────────────────────────────
// Los cuatro salen de `journal_lines`: son la contabilidad, no un agregado
// paralelo. Todo importe viaja como string con dos decimales; pasarlo por
// `Number` para algo que no sea pintarlo reintroduce el double.
export type DateRange = { from: string; to: string };

// Un asiento reversado sigue sumando en el mayor (él y su reverso se cancelan):
// el estado es descargo, no filtro.
export type JournalEntryStatus = 'POSTED' | 'VOID' | 'REVERSED';

export type LedgerLine = {
  date: string;
  entryId: string;
  entryNumber: string;
  entryStatus: JournalEntryStatus;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
};

export type Ledger = {
  account: { id: string; code: string; name: string; type: AccountType; currency: string | null };
  currency: string;
  range: DateRange;
  openingBalance: string;
  lines: LedgerLine[];
  // Cierre y total son del RANGO, no de la página: el corrido de la última línea
  // de la última página coincide con `closingBalance`.
  closingBalance: string;
  total: number;
  page: number;
  pageSize: number;
};

export type AccountBalance = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  balance: string;
};

export type AccountBalances = { currency: string; asOf: string; accounts: AccountBalance[] };

// ─── Consolidado a una sola moneda ────────────────────────────────────────────
// Tres reportes (comprobación, P&L y balance general) aceptan `consolidateTo` EN
// LUGAR de `currency`: mandar los dos es 400. Cuando se consolida, el backend
// devuelve con qué tasa convirtió cada moneda y —lo importante— cuáles se quedó
// sin convertir: esas NO están sumadas en ningún total y el panel las muestra
// como N/A, nunca como cero (criterio 16 del plan).
export type ConsolidationRate = {
  from: string;
  to: string;
  rate: string;
  date: string; // día de la tasa usada (la última con `date ≤` corte), no el corte
  source: string;
};

export type Consolidation = {
  to: string;
  rates: ConsolidationRate[];
  missing: string[];
} | null;

/** `currency` XOR `consolidateTo`: la UI los ofrece como un solo selector. */
export type CurrencyScope = { currency?: string; consolidateTo?: string };

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  // `1190 Traslados entre monedas`: la contrapartida temporal de una conversión,
  // no plata disponible. Se etiqueta para que su saldo no se lea como efectivo.
  isBridge: boolean;
  debits: string;
  credits: string;
  balance: string;
};

export type TrialBalance = {
  currency: string;
  range: DateRange;
  consolidation: Consolidation;
  accounts: TrialBalanceRow[];
  totals: { debits: string; credits: string };
  balanced: boolean;
  difference: string;
};

export type Pnl = {
  range: DateRange;
  // Consolidado, `byCurrency`/`byAccount`/`byMonth` COLAPSAN a la moneda de
  // destino: no se agrega un bloque extra, se reemplazan los que había.
  consolidation: Consolidation;
  byCurrency: {
    currency: string;
    income: string;
    costOfRevenue: string;
    operatingExpense: string;
    net: string;
  }[];
  byAccount: {
    currency: string;
    accountCode: string;
    accountName: string;
    type: AccountType;
    amount: string;
  }[];
  // `expense` = costo de ingresos + gasto operativo.
  byMonth: { currency: string; month: string; income: string; expense: string; net: string }[];
};

// ─── Balance general ──────────────────────────────────────────────────────────
/**
 * Una fila del balance. Casi siempre es una cuenta; las que llevan
 * `computed: true` (y `accountId`/`code` en `null`) son las líneas CALCULADAS de
 * patrimonio: "Resultado del período (no cerrado)" siempre, y "Ajuste por
 * conversión" solo en el consolidado.
 */
export type BalanceSheetLine = {
  accountId: string | null;
  code: string | null;
  name: string;
  parentCode: string | null;
  depth: number;
  isActive: boolean;
  // La fila es una cuenta padre y su `balance` es el de TODA su rama: el panel no
  // vuelve a sumarla, ya está sumada.
  isSubtotal: boolean;
  isBridge: boolean;
  computed: boolean;
  // `historical` = el puente `1190`, valorado a la tasa del día de cada conversión
  // (o sea, cero). `cta` = el ajuste por conversión (NIC 21). El resto, `current`.
  valuation: 'current' | 'historical' | 'cta';
  balance: string;
};

export type BalanceSheetSection = {
  type: AccountType;
  lines: BalanceSheetLine[];
  total: string;
};

export type BalanceSheet = {
  currency: string;
  asOf: string;
  consolidation: Consolidation;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totals: { assets: string; liabilities: string; equity: string };
  // Viajan SIEMPRE, cuadre o no: esconder una diferencia es lo único que un
  // balance no puede hacer (criterio 13 del plan).
  balanced: boolean;
  difference: string;
};

// ─── Flujo de caja ────────────────────────────────────────────────────────────
// Solo por moneda: no acepta `consolidateTo`. Un flujo consolidado exigiría
// decidir a qué tasa se convierte cada movimiento, y eso es otra decisión.
export type CashFlowAccount = {
  accountId: string;
  code: string;
  name: string;
  opening: string;
  inflow: string;
  outflow: string;
  closing: string;
};

export type CashFlow = {
  currency: string;
  range: DateRange;
  // Las cuentas HOJA que cuelgan de `1100 Efectivo y equivalentes` más `1220`.
  // Una caja sin movimiento aparece en cero; una caja ausente no existe.
  accounts: CashFlowAccount[];
  totals: { opening: string; inflow: string; outflow: string; closing: string };
  byMonth: { month: string; inflow: string; outflow: string; net: string }[];
};

// ─── Tipos de cambio ──────────────────────────────────────────────────────────
// Se cargan a mano (no hay proveedor): por eso `source` es obligatorio —"BCCR
// venta 2026-09-05"— y por eso los reportes usan la ÚLTIMA tasa con fecha ≤ el
// corte, no la del día exacto.
export type ExchangeRate = {
  id: string;
  date: string; // 'YYYY-MM-DD': la columna es DATE, sin hora
  fromCurrency: string;
  toCurrency: string;
  rate: string; // string con hasta 8 decimales
  source: string;
  createdBy: string | null;
  createdAt: string;
};

export type ExchangeRateInput = {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  source: string;
};

export type ExchangeRateListQuery = {
  fromCurrency?: string;
  toCurrency?: string;
  page: number;
  pageSize: number;
};

export type ExchangeRatePage = {
  items: ExchangeRate[];
  total: number;
  page: number;
  pageSize: number;
};

export type FinanceCategoryInput = {
  name: string;
  kind: FinanceKind;
  sortOrder?: number;
  accountId?: string | null;
};
export type FinanceCategoryUpdate = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  accountId?: string | null;
};

export type FinanceEntryInput = {
  categoryId: string;
  amount: string;
  currency: string;
  date: string;
  type: MovementType;
  // Cuenta de origen: solo la transferencia la exige, y solo el alta la acepta
  // (el PATCH del backend no la lleva — ver `UpdateFinanceEntrySchema`).
  accountId?: string | null;
  counterAccountId: string | null; // null → "1900 Por clasificar"
  // Solo en una transferencia entre cuentas de monedas DISTINTAS: lo que llega al
  // destino. El backend deriva la diferencia contra el tipo del día y la manda a
  // `6520 Diferencial cambiario`. En cualquier otro movimiento es 409
  // COUNTER_AMOUNT_NOT_APPLICABLE.
  counterAmount?: string;
  vendor: string | null;
  note: string | null;
  receiptKey: string | null;
};
// `counterAmount` no está: el PATCH del backend no lo lleva (`UpdateFinanceEntrySchema`),
// y un movimiento asentado ya no cambia de importes.
export type FinanceEntryUpdate = Partial<Omit<FinanceEntryInput, 'accountId' | 'counterAmount'>>;

const BASE = '/api/admin/finance';

/**
 * Mutación contra el BFF de finanzas. Exportada porque el hook de planeamiento
 * (`use-finance-planning.ts`) manda contra el MISMO prefijo y con el mismo
 * envelope de error: una segunda copia derivaría, y con ella el manejo del 409
 * contable.
 */
export async function sendFinanceRequest(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  // El envelope de error del backend es `{ error: { code, message, details } }`:
  // leer `body.message` a secas dejaba el 409 contable ("La categoría X no tiene
  // cuenta contable asignada") como un "Error" mudo, sin decir qué arreglar.
  if (!res.ok) await throwApiError(res, 'Error');
  return res.json().catch(() => ({}));
}

// ─── Plan de cuentas ──────────────────────────────────────────────────────────
// El plan base se siembra (`seed:accounting`); desde el panel se le agregan
// cuentas hijas y se retiran las que ya no se usan. Se cachea en vez de
// re-pedirlo en cada apertura del formulario.
// `postable: true` = la cuenta se puede elegir a mano (activa y con asiento manual).
export function useFinanceAccounts(filters: { postable?: boolean; type?: AccountType } = {}) {
  const { postable, type } = filters;
  return useQuery({
    queryKey: ['finance-accounts', postable ?? null, type ?? null],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FinanceAccount[]> => {
      const params = new URLSearchParams();
      if (postable !== undefined) params.set('postable', String(postable));
      if (type) params.set('type', type);
      const qs = params.toString();
      return (await fetchJson<FinanceAccount[]>(`${BASE}/accounts${qs ? `?${qs}` : ''}`)) ?? [];
    },
  });
}

// Una cuenta no se borra: se retira con `isActive: false`. El backend no expone DELETE.
export function useFinanceAccountMutations() {
  const qc = useQueryClient();
  // Alta y edición cambian el árbol y los saldos que se pintan al lado.
  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['finance-accounts'] }),
      qc.invalidateQueries({ queryKey: ['finance-balances'] }),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: (input: FinanceAccountInput) => sendFinanceRequest(`${BASE}/accounts`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceAccountUpdate }) =>
        sendFinanceRequest(`${BASE}/accounts/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
  };
}

// ─── Categorías ───────────────────────────────────────────────────────────────
export function useFinanceCategories(kind?: FinanceKind) {
  return useQuery({
    queryKey: ['finance-categories', kind ?? null],
    queryFn: async (): Promise<FinanceCategory[]> => {
      const qs = kind ? `?kind=${kind}` : '';
      return (await fetchJson<FinanceCategory[]>(`${BASE}/categories${qs}`)) ?? [];
    },
  });
}

export function useFinanceCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance-categories'] });
  return {
    create: useMutation({
      mutationFn: (input: FinanceCategoryInput) => sendFinanceRequest(`${BASE}/categories`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceCategoryUpdate }) =>
        sendFinanceRequest(`${BASE}/categories/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => sendFinanceRequest(`${BASE}/categories/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

// ─── Movimientos ────────────────────────────────────────────────────────────────
export function useFinanceEntries(query: FinanceEntryListQuery) {
  return useQuery({
    queryKey: ['finance-entries', query],
    // Paginación server-side: sin esto la tabla se vacía en cada cambio de
    // página y la fila que se venía mirando salta de posición.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<EntryListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      return (
        (await fetchJson<EntryListPage>(`${BASE}/entries?${params}`)) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useFinanceEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['finance-entry', id],
    enabled: !!id,
    queryFn: async (): Promise<FinanceEntry | undefined> => {
      return fetchJson<FinanceEntry>(`${BASE}/entries/${id}`);
    },
  });
}

// Toda mutación de un movimiento genera (o reversa) un asiento: cambia la lista,
// el detalle y los cuatro reportes que salen del mayor.
function useInvalidateEntries(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    await Promise.all(
      [
        'finance-entries',
        'finance-entry',
        'finance-pnl',
        'finance-ledger',
        'finance-trial-balance',
        'finance-balances',
      ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
  };
}

export function useFinanceEntryMutations() {
  const invalidate = useInvalidateEntries();
  return {
    create: useMutation({
      mutationFn: (input: FinanceEntryInput) => sendFinanceRequest(`${BASE}/entries`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceEntryUpdate }) =>
        sendFinanceRequest(`${BASE}/entries/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
  };
}

// Un movimiento contabilizado no se borra: se anula. El asiento original queda
// REVERSED y nace su reverso, así que el motivo es obligatorio (5..300): es lo
// único que explica meses después por qué el libro tiene un asiento y su espejo.
export function useVoidFinanceEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      sendFinanceRequest(`${BASE}/entries/${id}/void`, 'POST', { reason }),
    onSuccess: invalidate,
  });
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
export type FinanceReport =
  | 'ledger'
  | 'trial-balance'
  | 'pnl'
  | 'balance-sheet'
  | 'cash-flow'
  | 'budget-variance';

type ReportParams = Record<string, string | number | undefined>;

function reportQuery(params: ReportParams): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * URL del CSV en el BFF. La descarga la hace `downloadReport` (`lib/download-report.ts`)
 * con fetch: un `<a download>` guardaría el JSON de un 413 o de un 401 como si fuera
 * el archivo.
 */
export function financeReportCsvHref(report: FinanceReport, params: ReportParams): string {
  return `${BASE}/reports/${report}.csv${reportQuery(params)}`;
}

// El mayor es el de UNA cuenta en UNA moneda: sin las dos no hay reporte que pedir
// (un saldo corrido que mezcla colones con dólares no es un saldo).
export function useFinanceLedger(params: {
  accountId?: string;
  currency?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  const { accountId, currency } = params;
  return useQuery({
    queryKey: ['finance-ledger', params],
    enabled: !!accountId && !!currency,
    // Sin esto la tabla se vacía en cada cambio de página y la fila que se venía
    // mirando salta de posición.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Ledger | undefined> =>
      fetchJson<Ledger>(`${BASE}/reports/ledger${reportQuery({ ...params })}`),
  });
}

export function useFinanceAccountBalances(currency: string, asOf?: string) {
  return useQuery({
    queryKey: ['finance-balances', currency, asOf ?? null],
    enabled: !!currency,
    queryFn: async (): Promise<AccountBalances | undefined> =>
      fetchJson<AccountBalances>(`${BASE}/reports/balances${reportQuery({ currency, asOf })}`),
  });
}

export function useFinanceTrialBalance(
  params: CurrencyScope & {
    from?: string;
    to?: string;
  },
) {
  return useQuery({
    queryKey: ['finance-trial-balance', params],
    // Sin ninguna de las dos el backend responde 400: no hay reporte que pedir.
    enabled: !!params.currency !== !!params.consolidateTo,
    queryFn: async (): Promise<TrialBalance | undefined> =>
      fetchJson<TrialBalance>(`${BASE}/reports/trial-balance${reportQuery({ ...params })}`),
  });
}

export function useFinancePnl(params: CurrencyScope & { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['finance-pnl', params],
    queryFn: async (): Promise<Pnl | undefined> =>
      fetchJson<Pnl>(`${BASE}/reports/pnl${reportQuery({ ...params })}`),
  });
}

/**
 * Balance general a una fecha. `currency` XOR `consolidateTo`: mandar las dos (o
 * ninguna) es 400, así que la consulta no se dispara hasta que haya exactamente
 * una.
 */
export function useFinanceBalanceSheet(params: CurrencyScope & { asOf?: string }) {
  return useQuery({
    queryKey: ['finance-balance-sheet', params],
    enabled: !!params.currency !== !!params.consolidateTo,
    queryFn: async (): Promise<BalanceSheet | undefined> =>
      fetchJson<BalanceSheet>(`${BASE}/reports/balance-sheet${reportQuery({ ...params })}`),
  });
}

export function useFinanceCashFlow(params: { currency?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['finance-cash-flow', params],
    enabled: !!params.currency,
    queryFn: async (): Promise<CashFlow | undefined> =>
      fetchJson<CashFlow>(`${BASE}/reports/cash-flow${reportQuery({ ...params })}`),
  });
}

// ─── Tipos de cambio ──────────────────────────────────────────────────────────
export function useExchangeRates(query: ExchangeRateListQuery) {
  return useQuery({
    queryKey: ['finance-exchange-rates', query],
    // Sin esto la tabla se vacía en cada cambio de página.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ExchangeRatePage> =>
      (await fetchJson<ExchangeRatePage>(`${BASE}/exchange-rates${reportQuery({ ...query })}`)) ?? {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      },
  });
}

/**
 * Acá SÍ hay DELETE, al revés que en movimientos y cuentas: una tasa no es un
 * hecho económico y nada la referencia (el asiento de una conversión guarda los
 * importes ya calculados). Una mal tecleada distorsiona todo consolidado
 * posterior, y obligar a convivir con ella sería peor.
 *
 * Cargar o borrar una tasa cambia lo que dicen los tres reportes consolidados:
 * se invalidan junto con la lista.
 */
export function useExchangeRateMutations() {
  const qc = useQueryClient();
  const invalidate = async () => {
    await Promise.all(
      [
        'finance-exchange-rates',
        'finance-balance-sheet',
        'finance-trial-balance',
        'finance-pnl',
      ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    create: useMutation({
      mutationFn: (input: ExchangeRateInput) => sendFinanceRequest(`${BASE}/exchange-rates`, 'POST', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => sendFinanceRequest(`${BASE}/exchange-rates/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

// ─── Órdenes de Google Play ───────────────────────────────────────────────────
// La plata real de las suscripciones: qué cobró Google, qué se llevó de comisión
// y qué órdenes NO llegaron a asentarse. Solo lectura + reintentar: el asiento lo
// emite el worker del backend, nunca el panel.
export const PLAY_ORDER_STATUSES = [
  'PENDING',
  'POSTED',
  'UNSUPPORTED_CURRENCY',
  'REVERSED',
  'FAILED',
  'SKIPPED',
  'NEEDS_REVIEW',
] as const;
export type PlayOrderStatus = (typeof PLAY_ORDER_STATUSES)[number];

// Los tres que alguien tiene que mirar: son ingresos cobrados que todavía no
// están en el libro (o que dejaron de estarlo).
export const PLAY_ORDER_ATTENTION_STATUSES = [
  'FAILED',
  'NEEDS_REVIEW',
  'UNSUPPORTED_CURRENCY',
] as const satisfies readonly PlayOrderStatus[];

export type PlayOrder = {
  orderId: string;
  subscriptionId: string | null;
  userId: string | null;
  /** Estado CRUDO de la orden en Google (`PROCESSED`, `PENDING`, `REFUNDED`…). */
  state: string;
  createTime: string;
  // Cada monto viaja con SU moneda: es la del comprador, no la del panel, y puede
  // ser una que la contabilidad todavía no maneja. Nunca se convierte ni se suma
  // entre monedas distintas.
  totalAmount: string;
  totalCurrency: string;
  /** Impuesto que recauda y remite Google: informativo, NO se asienta. */
  taxAmount: string;
  taxCurrency: string;
  developerRevenue: string;
  developerRevenueCurrency: string;
  /** `(total − impuesto) − neto`. `null` si la orden mezcla monedas. */
  commission: string | null;
  postingStatus: PlayOrderStatus;
  postingError: string | null;
  // Instante en que llegó el reembolso. Es lo único que explica por qué una orden
  // `SKIPPED` no tiene asiento y nunca lo va a tener, y por qué reintentarla no
  // va a cambiar nada.
  refundRequestedAt: string | null;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
};

export type PlayOrderListQuery = {
  postingStatus?: PlayOrderStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type PlayOrderPage = {
  items: PlayOrder[];
  total: number;
  page: number;
  pageSize: number;
};

function playOrdersPath(query: PlayOrderListQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') continue;
    params.set(k, String(v));
  }
  return `${BASE}/play-orders?${params}`;
}

export function usePlayOrders(query: PlayOrderListQuery) {
  return useQuery({
    queryKey: ['play-orders', query],
    // Paginación server-side: sin esto la tabla se vacía en cada cambio de página.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PlayOrderPage> =>
      (await fetchJson<PlayOrderPage>(playOrdersPath(query))) ?? {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      },
  });
}

/** Los siete conteos del rango, más los que alguien tiene que mirar. */
export type PlayOrderSummary = {
  counts: Record<string, number>;
  needsAttention: number;
};

/**
 * Conteo por estado del MISMO rango que se está mirando, en UNA consulta.
 *
 * El backend agrega con un `groupBy` y devuelve los siete estados siempre,
 * también los que están en cero. Antes eran siete requests (la misma lista con
 * `pageSize: 1`, leyendo solo `total`), que además podían llegar desparejas: el
 * semáforo y la tabla mostraban rangos distintos por un instante.
 */
export function usePlayOrderCounts(range: { from?: string; to?: string }) {
  const query = useQuery({
    queryKey: ['play-orders-summary', range],
    // Sin esto los conteos desaparecen al cambiar el rango y el semáforo parpadea.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PlayOrderSummary | undefined> =>
      fetchJson<PlayOrderSummary>(`${BASE}/play-orders/summary${reportQuery({ ...range })}`),
  });
  const counts = query.data?.counts;
  return {
    isLoading: query.isLoading,
    // Un conteo que no llegó no es un cero: quien mira tiene que poder
    // distinguirlos, o va a leer "0 sin asentar" sobre un endpoint caído.
    isError: query.isError,
    refetch: query.refetch,
    counts: Object.fromEntries(
      PLAY_ORDER_STATUSES.map((status) => [status, counts?.[status]]),
    ) as Record<PlayOrderStatus, number | undefined>,
    needsAttention: query.data?.needsAttention,
  };
}

/**
 * Re-encola la ingesta y el asiento de una orden. El job es idempotente: sirve
 * para las dos cosas que cambian entre un intento y el siguiente — el plan de
 * cuentas y el enum de monedas del backend.
 */
export function useRetryPlayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      sendFinanceRequest(`${BASE}/play-orders/${encodeURIComponent(orderId)}/retry`, 'POST'),
    // El asiento que emite el worker entra al P&L: la lista y el estado de
    // resultados dejan de coincidir si solo se refresca la primera.
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['play-orders'] }),
        qc.invalidateQueries({ queryKey: ['finance-pnl'] }),
      ]);
    },
  });
}

// Sube el comprobante (pdf/imagen) y devuelve la key R2 para guardar en el movimiento.
export async function uploadReceipt(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
  const dataBase64 = dataUrl.split(',')[1] ?? '';
  const res = await fetch(`${BASE}/entries/upload-receipt`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64 }),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error subiendo el comprobante');
  }
  const data = unwrapData<{ url: string }>(await res.json());
  if (!data?.url) throw new Error('Respuesta de subida inválida');
  return data.url; // key privada (no pública)
}
