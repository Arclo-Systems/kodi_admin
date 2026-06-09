'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type FinanceKind = 'expense' | 'income';
export const KIND_LABELS: Record<FinanceKind, string> = { expense: 'Gasto', income: 'Ingreso' };
export const FINANCE_CURRENCIES = ['CRC', 'USD'] as const;

export type FinanceCategory = {
  id: string;
  name: string;
  kind: FinanceKind;
  sortOrder: number;
  isActive: boolean;
};

export type FinanceEntry = {
  id: string;
  categoryId: string;
  categoryName: string;
  kind: FinanceKind;
  amount: number;
  currency: string;
  date: string;
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

export type FinanceCategoryInput = { name: string; kind: FinanceKind; sortOrder?: number };
export type FinanceCategoryUpdate = { name?: string; sortOrder?: number; isActive?: boolean };

export type FinanceEntryInput = {
  categoryId: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  note: string | null;
  receiptKey: string | null;
};
export type FinanceEntryUpdate = Partial<FinanceEntryInput>;

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
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

// ─── Categorías ───────────────────────────────────────────────────────────────
export function useFinanceCategories(kind?: FinanceKind) {
  return useQuery({
    queryKey: ['finance-categories', kind ?? null],
    queryFn: async (): Promise<FinanceCategory[]> => {
      const qs = kind ? `?kind=${kind}` : '';
      const res = await fetch(`${BASE}/categories${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch finance categories failed');
      return unwrapData<FinanceCategory[]>(await res.json()) ?? [];
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
    queryFn: async (): Promise<EntryListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`${BASE}/entries?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch finance entries failed');
      return (
        unwrapData<EntryListPage>(await res.json()) ?? {
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
      const res = await fetch(`${BASE}/entries/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch finance entry failed');
      return unwrapData<FinanceEntry>(await res.json());
    },
  });
}

export function useFinanceEntryMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['finance-entries'] });
    qc.invalidateQueries({ queryKey: ['finance-entry'] });
    qc.invalidateQueries({ queryKey: ['finance-pnl'] });
  };
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
    remove: useMutation({
      mutationFn: (id: string) => send(`${BASE}/entries/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
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
      const res = await fetch(`${BASE}/pnl${qs ? `?${qs}` : ''}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch pnl failed');
      return unwrapData<Pnl>(await res.json());
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
