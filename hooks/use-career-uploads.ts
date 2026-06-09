'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import type { CutoffStatus } from '@/hooks/use-cutoffs';

// La subida de carreras usa los mismos estados que cortes (pending_review/applied/rejected).
export type CareerUploadStatus = CutoffStatus;

export type CareerRow = {
  name: string;
  area: string | null;
  riasecCode: string;
  description: string | null;
  fieldOfWork: string | null;
  durationYears: number | null;
  employmentRate: number | null;
  avgSalaryMonthly: number | null;
  demandLevel: string | null;
  marketNote: string | null;
  olapYear: number | null;
};

export type CareerInvalidRow = { name: string; riasecCode: string; reason: string };

export type CareerDiffSummary = {
  toInsert: number;
  toUpdate: number;
  invalid: number;
  invalidRows?: CareerInvalidRow[];
};

export type CareerUpload = {
  id: string;
  moduleId: string;
  module?: { shortName: string } | null;
  country: string;
  status: CareerUploadStatus;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  diffSummary: CareerDiffSummary;
  createdAt: string;
};

export type CareerUploadDetail = CareerUpload & {
  rowsToInsert: CareerRow[];
  rowsToUpdate: CareerRow[];
};

export function useCareerUploads(status?: CareerUploadStatus) {
  return useQuery({
    queryKey: ['career-uploads', status ?? null],
    queryFn: async (): Promise<CareerUpload[]> => {
      const qs = status ? `?status=${status}` : '';
      const res = await fetch(`/api/admin/content/career-uploads${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch career-uploads failed');
      return unwrapData<CareerUpload[]>(await res.json()) ?? [];
    },
  });
}

export function useCareerUpload(id: string) {
  return useQuery({
    queryKey: ['career-upload', id],
    enabled: !!id,
    queryFn: async (): Promise<CareerUploadDetail | undefined> => {
      const res = await fetch(`/api/admin/content/career-uploads/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch career-upload failed');
      return unwrapData<CareerUploadDetail>(await res.json());
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

export function useCareerUploadMutations() {
  const qc = useQueryClient();
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['career-uploads'] });
    qc.invalidateQueries({ queryKey: ['career-upload'] });
    qc.invalidateQueries({ queryKey: ['careers'] });
  };
  return {
    upload: useMutation({
      mutationFn: async (v: { moduleId: string; country: string; csv: string }) => {
        const res = await fetch('/api/admin/content/career-uploads/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(v),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error subiendo');
        }
        return unwrapData<CareerUpload>(await res.json());
      },
      onSuccess: inval,
    }),
    approve: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/career-uploads/${id}/approve`, {}),
      onSuccess: inval,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        send(`/api/admin/content/career-uploads/${id}/reject`, { reason }),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const res = await fetch(`/api/admin/content/career-uploads/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error');
        }
      },
      onSuccess: inval,
    }),
  };
}
