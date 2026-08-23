'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type TxTemplate = {
  key: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  secondary: string | null;
  allowedVars: string[];
};

export type TxTemplateInput = {
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  secondary: string | null;
};

export function useTxTemplates() {
  return useQuery({
    queryKey: ['tx-templates'],
    queryFn: async (): Promise<TxTemplate[]> => {
      return (
        (await fetchJson<TxTemplate[]>(
          '/api/admin/messaging/transactional-templates',
        )) ?? []
      );
    },
  });
}

// Previsualización del borrador: el backend devuelve el HTML REAL del email sin
// persistir nada. No es useQuery porque se dispara con debounce al tipear y se
// cancela con AbortSignal — el ciclo de vida lo maneja el componente.
export async function fetchTxTemplatePreview(
  key: string,
  input: TxTemplateInput,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(`/api/admin/messaging/transactional-templates/${key}/preview`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  // El backend envuelve el error en { error: { code, message } }; el mensaje literal
  // (p. ej. UNKNOWN_TEMPLATE_VAR) es justo lo que hay que mostrarle al admin.
  const body = (await res.json().catch(() => ({}))) as {
    data?: { html?: string };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? 'No se pudo generar la vista previa.');
  return body.data?.html ?? '';
}

export function useUpdateTxTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, input }: { key: string; input: TxTemplateInput }) => {
      const res = await fetch(`/api/admin/messaging/transactional-templates/${key}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tx-templates'] }),
  });
}
