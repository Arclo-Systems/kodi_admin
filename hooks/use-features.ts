'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type FeatureStatus = 'idea' | 'construccion' | 'lanzado' | 'descartado';
export type FeaturePriority = 'low' | 'medium' | 'high';

export const FEATURE_STATUSES: FeatureStatus[] = [
  'idea',
  'construccion',
  'lanzado',
  'descartado',
];

export const FEATURE_LABELS: Record<FeatureStatus, string> = {
  idea: 'Idea',
  construccion: 'En construcción',
  lanzado: 'Lanzado',
  descartado: 'Descartado',
};

export const PRIORITY_LABELS: Record<FeaturePriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export type FeatureIdea = {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  priority: FeaturePriority;
  author: { id: string; displayName: string } | null;
  sourceTicketId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeatureInput = {
  title: string;
  description?: string;
  priority: FeaturePriority;
  sourceTicketId?: string;
};

type FeatureList = { items: FeatureIdea[] };

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useFeatures(search?: string) {
  return useQuery({
    queryKey: ['features', search ?? ''],
    queryFn: async (): Promise<FeatureList> => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/features${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch features failed');
      return unwrapData<FeatureList>(await res.json()) ?? { items: [] };
    },
  });
}

async function sendDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export function useCreateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeatureInput): Promise<string> => {
      const body = await sendJson('/api/admin/features', 'POST', input);
      return unwrapData<{ id: string }>(body)?.id ?? '';
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features'] }),
  });
}

export function useDeleteFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendDelete(`/api/admin/features/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features'] }),
  });
}

// Cambio de etapa (drag en el Kanban) o edición. Optimista solo para el drag de etapa.
export function useUpdateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<FeatureInput> & { status?: FeatureStatus };
    }) => sendJson(`/api/admin/features/${id}`, 'PATCH', input),
    onMutate: async ({ id, input }) => {
      // Optimista solo para el cambio de etapa (drag). Snapshot siempre para tipado estable.
      await qc.cancelQueries({ queryKey: ['features'] });
      const snapshots = qc.getQueriesData<FeatureList>({ queryKey: ['features'] });
      if (input.status) {
        const next = input.status;
        for (const [key, page] of snapshots) {
          if (!page) continue;
          qc.setQueryData<FeatureList>(key, {
            items: page.items.map((f) => (f.id === id ? { ...f, status: next } : f)),
          });
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, page]) => qc.setQueryData(key, page));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['features'] }),
  });
}
