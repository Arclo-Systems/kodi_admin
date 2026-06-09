'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type SegmentFilters = {
  country?: string[];
  plan?: string[];
  accountStatus?: 'pending_parental' | 'active' | 'suspended';
  lastActiveWithinDays?: number;
};

export type UserSegment = {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentFilters;
  lastCount: number;
  lastCountAt: string | null;
  createdAt: string;
};

export type SegmentInput = {
  name?: string;
  description?: string;
  filters: SegmentFilters;
};

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<unknown> {
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

export function useSegments() {
  return useQuery({
    queryKey: ['messaging', 'segments'],
    queryFn: async (): Promise<UserSegment[]> => {
      const res = await fetch('/api/admin/messaging/segments', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch segments failed');
      return unwrapData<UserSegment[]>(await res.json()) ?? [];
    },
  });
}

export function useSegmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['messaging', 'segments'] });
  return {
    create: useMutation({
      mutationFn: (input: SegmentInput) => send('/api/admin/messaging/segments', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SegmentInput }) =>
        send(`/api/admin/messaging/segments/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/messaging/segments/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

// Preview de conteo en vivo para unos filtros (no persiste).
export async function previewSegmentCount(filters: SegmentFilters): Promise<number> {
  const res = await fetch('/api/admin/messaging/segments/preview-count', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  if (!res.ok) throw new Error('preview-count failed');
  return unwrapData<{ count: number }>(await res.json())?.count ?? 0;
}
