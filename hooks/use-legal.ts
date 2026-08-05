'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const LEGAL_DOCS = ['terms', 'privacy', 'raffle_rules'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

/** Nombre de cada documento como lo ve el admin (tabs, títulos, confirmaciones). */
export const DOC_LABELS: Record<LegalDoc, string> = {
  terms: 'Términos de uso',
  privacy: 'Política de privacidad',
  raffle_rules: 'Bases de premiaciones',
};

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

export type UpdateLegalDocumentInput = {
  sections: LegalSection[];
  /** La versión que traía el GET del que salió este borrador (control optimista). */
  expectedVersion: string;
};

// El texto legal se edita despacio y la ventana entre abrir y publicar es larga:
// sin `expected_version` el último en apretar Publicar pisa en silencio lo que
// publicó otro admin. El backend responde 409 en vez de guardar, y el borrador
// se conserva para que el admin pueda copiar lo suyo antes de recargar.
const CONFLICT_MESSAGE = 'Otro admin publicó mientras editabas — recargá.';

export function useUpdateLegalDocument(doc: LegalDoc) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sections, expectedVersion }: UpdateLegalDocumentInput) => {
      const res = await fetch(`/api/admin/legal/${doc}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sections, expected_version: expectedVersion }),
      });
      if (res.status === 409) throw new Error(CONFLICT_MESSAGE);
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
