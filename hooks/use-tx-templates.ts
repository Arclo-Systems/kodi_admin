'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

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
      const res = await fetch('/api/admin/messaging/transactional-templates', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch tx-templates failed');
      return unwrapData<TxTemplate[]>(await res.json()) ?? [];
    },
  });
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
