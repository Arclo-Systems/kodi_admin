'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
  overdue: 'Vencida',
  void: 'Anulada',
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sourceType: string;
  sourceId: string | null;
  cabysCode: string | null;
};

export type InvoiceSummary = {
  id: string;
  sponsorId: string;
  sponsor?: { name: string } | null;
  number: string;
  status: InvoiceStatus;
  currency: 'CRC' | 'USD';
  issueDate: string;
  dueDate: string;
  total: number;
  itemCount: number;
};

export type InvoiceDetail = {
  id: string;
  sponsorId: string;
  sponsor?: { name: string } | null;
  number: string;
  status: InvoiceStatus;
  currency: 'CRC' | 'USD';
  appliesIva: boolean;
  issueDate: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  subtotal: number;
  ivaAmount: number;
  total: number;
  notes: string | null;
  pdfUrl: string | null;
  paidAt: string | null;
  items: InvoiceItem[];
};

export type CreateInvoiceInput = {
  sponsorId: string;
  dueDate: string;
  issueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  includeAuto: boolean;
  notes?: string;
  manualItems?: { description: string; quantity: number; unitPrice: number; cabysCode?: string }[];
};

export type UpdateInvoiceInput = {
  dueDate?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  notes?: string | null;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    sourceType?: string;
    sourceId?: string | null;
    cabysCode?: string;
  }[];
};

type InvoiceListPage = { items: InvoiceSummary[]; total: number; page: number; pageSize: number };

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useSponsorInvoices(params: { sponsorId?: string; status?: InvoiceStatus }) {
  return useQuery({
    queryKey: ['sponsor-invoices', params],
    queryFn: async (): Promise<InvoiceSummary[]> => {
      const qs = new URLSearchParams({ page: '1', pageSize: '100' });
      if (params.sponsorId) qs.set('sponsorId', params.sponsorId);
      if (params.status) qs.set('status', params.status);
      const res = await fetch(`/api/admin/economy/sponsor-invoices?${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch invoices failed');
      return unwrapData<InvoiceListPage>(await res.json())?.items ?? [];
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['sponsor-invoice', id],
    enabled: !!id,
    queryFn: async (): Promise<InvoiceDetail | undefined> => {
      const res = await fetch(`/api/admin/economy/sponsor-invoices/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch invoice failed');
      return unwrapData<InvoiceDetail>(await res.json());
    },
  });
}

export function useInvoiceMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: CreateInvoiceInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/sponsor-invoices', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsor-invoices'] }),
    }),
    updateDraft: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateInvoiceInput }) =>
        sendJson(`/api/admin/economy/sponsor-invoices/${id}`, 'PATCH', input),
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries({ queryKey: ['sponsor-invoices'] });
        qc.invalidateQueries({ queryKey: ['sponsor-invoice', id] });
      },
    }),
  };
}

export function useInvoiceActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sponsor-invoices'] });
    qc.invalidateQueries({ queryKey: ['sponsor-invoice', id] });
  };
  const action = (verb: 'issue' | 'pay' | 'void' | 'pdf') =>
    sendJson(`/api/admin/economy/sponsor-invoices/${id}/${verb}`, 'POST', {});
  return {
    issue: useMutation({ mutationFn: () => action('issue'), onSuccess: invalidate }),
    pay: useMutation({ mutationFn: () => action('pay'), onSuccess: invalidate }),
    voidInvoice: useMutation({ mutationFn: () => action('void'), onSuccess: invalidate }),
    pdf: useMutation({
      mutationFn: async (): Promise<string | null> => {
        const body = await action('pdf');
        return unwrapData<{ pdfUrl: string | null }>(body)?.pdfUrl ?? null;
      },
      onSuccess: invalidate,
    }),
  };
}
