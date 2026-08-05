'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const LEGAL_DOCS = ['terms', 'privacy'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

export type LegalSection = {
  title: string;
  body: string;
};

export type LegalDocument = {
  doc: LegalDoc;
  version: string;
  lastUpdated: string;
  sections: LegalSection[];
  updatedBy: string | null;
  updatedAt: string | null;
};

export function useLegalDocument(doc: LegalDoc) {
  return useQuery({
    queryKey: ['legal', doc],
    queryFn: async (): Promise<LegalDocument | undefined> => {
      const res = await fetch(`/api/admin/legal/${doc}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch legal failed');
      return unwrapData<LegalDocument>(await res.json());
    },
  });
}

export function useUpdateLegalDocument(doc: LegalDoc) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sections: LegalSection[]) => {
      const res = await fetch(`/api/admin/legal/${doc}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: { message?: string };
        };
        throw new Error(b.error?.message ?? b.message ?? 'Error');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal', doc] }),
  });
}
