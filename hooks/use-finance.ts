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
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

type EntryListPage = { items: FinanceEntry[]; total: number; page: number; pageSize: number };

export type Pnl = {
  byCurrency: { currency: string; income: number; expense: number; net: number }[];
  byCategory: { currency: string; categoryName: string; kind: FinanceKind; total: number }[];
  byMonth: { currency: string; month: string; income: number; expense: number }[];
  range: { from: string; to: string };
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
// El plan se siembra (`seed:accounting`) y no se edita desde el panel: se cachea
// en vez de re-pedirlo en cada apertura del formulario.
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

// Toda mutación de un movimiento cambia la lista, el detalle y el P&L.
function useInvalidateEntries(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['finance-entries'] }),
      qc.invalidateQueries({ queryKey: ['finance-entry'] }),
      qc.invalidateQueries({ queryKey: ['finance-pnl'] }),
    ]);
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

// ─── P&L ──────────────────────────────────────────────────────────────────────
export function useFinancePnl(from?: string, to?: string) {
  return useQuery({
    queryKey: ['finance-pnl', from ?? null, to ?? null],
    queryFn: async (): Promise<Pnl | undefined> => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return fetchJson<Pnl>(`${BASE}/pnl${qs ? `?${qs}` : ''}`);
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
