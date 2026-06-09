'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type CutoffStatus = 'pending_review' | 'applied' | 'rejected';
export type InvalidRow = {
  university: string;
  faculty: string;
  career: string;
  campus: string;
  cutoffScore: string;
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
  faculty: string;
  career: string;
  campus: string | null;
  cutoffScore: number;
};
export type CutoffDetail = CutoffUpload & { rowsToInsert: CutoffRow[]; currentCutoffs?: CutoffRow[] };

export function useCutoffs(status?: CutoffStatus) {
  return useQuery({
    queryKey: ['cutoffs', status ?? null],
    queryFn: async (): Promise<CutoffUpload[]> => {
      const qs = status ? `?status=${status}` : '';
      const res = await fetch(`/api/admin/content/admission-cutoffs${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch cutoffs failed');
      return unwrapData<CutoffUpload[]>(await res.json()) ?? [];
    },
  });
}

export function useCutoff(id: string) {
  return useQuery({
    queryKey: ['cutoff', id],
    enabled: !!id,
    queryFn: async (): Promise<CutoffDetail | undefined> => {
      const res = await fetch(`/api/admin/content/admission-cutoffs/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch cutoff failed');
      return unwrapData<CutoffDetail>(await res.json());
    },
  });
}

async function send(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export function useCutoffMutations() {
  const qc = useQueryClient();
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['cutoffs'] });
    qc.invalidateQueries({ queryKey: ['cutoff'] });
  };
  return {
    upload: useMutation({
      mutationFn: async (v: { moduleId: string; country: string; year: number; csv: string }) => {
        const res = await fetch('/api/admin/content/admission-cutoffs/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(v),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error subiendo');
        }
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
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error');
        }
      },
      onSuccess: inval,
    }),
  };
}
