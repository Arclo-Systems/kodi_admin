'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
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

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debits: string;
  credits: string;
  balance: string;
};

export type TrialBalance = {
  currency: string;
  range: DateRange;
  accounts: TrialBalanceRow[];
  totals: { debits: string; credits: string };
  balanced: boolean;
  difference: string;
};

export type Pnl = {
  range: DateRange;
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
  vendor: string | null;
  note: string | null;
  receiptKey: string | null;
};
export type FinanceEntryUpdate = Partial<Omit<FinanceEntryInput, 'accountId'>>;

const BASE = '/api/admin/finance';

async function send(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
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
      mutationFn: (input: FinanceAccountInput) => send(`${BASE}/accounts`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceAccountUpdate }) =>
        send(`${BASE}/accounts/${id}`, 'PATCH', input),
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
      mutationFn: (input: FinanceCategoryInput) => send(`${BASE}/categories`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceCategoryUpdate }) =>
        send(`${BASE}/categories/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`${BASE}/categories/${id}`, 'DELETE'),
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
      mutationFn: (input: FinanceEntryInput) => send(`${BASE}/entries`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FinanceEntryUpdate }) =>
        send(`${BASE}/entries/${id}`, 'PATCH', input),
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
      send(`${BASE}/entries/${id}/void`, 'POST', { reason }),
    onSuccess: invalidate,
  });
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
export type FinanceReport = 'ledger' | 'trial-balance' | 'pnl';

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

export function useFinanceTrialBalance(params: {
  currency?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['finance-trial-balance', params],
    enabled: !!params.currency,
    queryFn: async (): Promise<TrialBalance | undefined> =>
      fetchJson<TrialBalance>(`${BASE}/reports/trial-balance${reportQuery({ ...params })}`),
  });
}

export function useFinancePnl(from?: string, to?: string) {
  return useQuery({
    queryKey: ['finance-pnl', from ?? null, to ?? null],
    queryFn: async (): Promise<Pnl | undefined> =>
      fetchJson<Pnl>(`${BASE}/reports/pnl${reportQuery({ from, to })}`),
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
