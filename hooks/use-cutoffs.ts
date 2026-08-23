'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwApiError, unwrapData } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';

export type CutoffStatus = 'pending_review' | 'applied' | 'rejected';
export type InvalidRow = {
  university: string;
  career: string;
  campus: string;
  cutoffScore: string;
  province: string;
  canton: string;
  reason: string;
};
export type DiffSummary = {
  toInsert: number;
  toDelete: number;
  invalid: number;
  invalidRows?: InvalidRow[];
};

export type CutoffUpload = {
  id: string;
  moduleId: string;
  module?: { shortName: string } | null;
  country: string;
  year: number;
  status: CutoffStatus;
  blobUrl: string;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  diffSummary: DiffSummary;
  createdAt: string;
};

export type CutoffRow = {
  university: string;
  career: string;
  campus: string | null;
  cutoffScore: number;
  province: string | null;
  canton: string | null;
};
export type CutoffDetail = CutoffUpload & { rowsToInsert: CutoffRow[]; currentCutoffs?: CutoffRow[] };

export const CUTOFF_DEGREES = ['diplomado', 'bachillerato', 'licenciatura'] as const;
export type CutoffDegree = (typeof CUTOFF_DEGREES)[number];
export const CUTOFF_MODALITIES = ['diurna', 'nocturna', 'virtual'] as const;
export type CutoffModality = (typeof CUTOFF_MODALITIES)[number];
export type CutoffMatchStatus = 'alias' | 'auto' | 'suggested' | 'unmatched';

export type CutoffMatchCandidate = { id: string; name: string; score: number };

export type CutoffMatch = {
  university: string;
  officialName: string;
  sourceCode: string | null;
  career: string;
  degrees: CutoffDegree[];
  emphases: string[];
  modality: CutoffModality | null;
  careerProfileId: string | null;
  status: CutoffMatchStatus;
  confidence: number;
  candidates: CutoffMatchCandidate[];
  rowCount: number;
  decided: boolean;
};

export type CutoffCatalogCareer = { id: string; name: string; shortName: string | null };

export type CutoffMatchesData = {
  matches: CutoffMatch[];
  pending: number;
  catalog: CutoffCatalogCareer[];
};

export type SaveCutoffMatchItem = {
  university: string;
  officialName: string;
  career: string;
  degrees: CutoffDegree[];
  emphases: string[];
  modality: CutoffModality | null;
  careerProfileId?: string;
  createCareer?: { name: string; area?: string };
};

export function useCutoffs(status?: CutoffStatus) {
  return useQuery({
    queryKey: ['cutoffs', status ?? null],
    queryFn: async (): Promise<CutoffUpload[]> => {
      const qs = status ? `?status=${status}` : '';
      return (
        (await fetchJson<CutoffUpload[]>(
          `/api/admin/content/admission-cutoffs${qs}`,
        )) ?? []
      );
    },
  });
}

export function useCutoff(id: string) {
  return useQuery({
    queryKey: ['cutoff', id],
    enabled: !!id,
    queryFn: async (): Promise<CutoffDetail | undefined> => {
      return fetchJson<CutoffDetail>(
        `/api/admin/content/admission-cutoffs/${id}`,
      );
    },
  });
}

const matchesKey = (id: string) => ['cutoff-matches', id] as const;

export function useCutoffMatches(id: string) {
  return useQuery({
    queryKey: matchesKey(id),
    enabled: !!id,
    queryFn: async (): Promise<CutoffMatchesData> => {
      const res = await fetch(`/api/admin/content/admission-cutoffs/${id}/matches`, {
        credentials: 'include',
      });
      if (!res.ok) await throwApiError(res, 'No se pudieron cargar los emparejamientos');
      return (
        unwrapData<CutoffMatchesData>(await res.json()) ?? { matches: [], pending: 0, catalog: [] }
      );
    },
  });
}

export function useSaveCutoffMatches(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: SaveCutoffMatchItem[]): Promise<CutoffMatchesData> => {
      const res = await fetch(`/api/admin/content/admission-cutoffs/${id}/matches`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) await throwApiError(res, 'No se pudieron guardar los emparejamientos');
      return (
        unwrapData<CutoffMatchesData>(await res.json()) ?? { matches: [], pending: 0, catalog: [] }
      );
    },
    // El PATCH devuelve la foto completa (incluye las carreras recién creadas): se siembra
    // en vez de refetchear para que la tabla no parpadee con datos viejos.
    onSuccess: (data) => {
      qc.setQueryData(matchesKey(id), data);
      qc.invalidateQueries({ queryKey: ['careers'] });
    },
  });
}

async function send(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, 'Error');
}

export function useCutoffMutations() {
  const qc = useQueryClient();
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['cutoffs'] });
    qc.invalidateQueries({ queryKey: ['cutoff'] });
    qc.invalidateQueries({ queryKey: ['cutoff-matches'] });
  };
  return {
    upload: useMutation({
      mutationFn: async (v: { moduleId: string; country: string; year: number; csv: string }) => {
        const res = await fetch('/api/admin/content/admission-cutoffs/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(v),
        });
        if (!res.ok) await throwApiError(res, 'Error subiendo');
        return unwrapData<CutoffUpload>(await res.json());
      },
      onSuccess: inval,
    }),
    approve: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/admission-cutoffs/${id}/approve`, {}),
      onSuccess: inval,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        send(`/api/admin/content/admission-cutoffs/${id}/reject`, { reason }),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const res = await fetch(`/api/admin/content/admission-cutoffs/${id}`, { method: 'DELETE' });
        if (!res.ok) await throwApiError(res, 'Error');
      },
      onSuccess: inval,
    }),
  };
}
