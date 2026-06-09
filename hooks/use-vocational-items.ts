'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const RIASEC_DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
export type VocDimension = (typeof RIASEC_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<VocDimension, string> = {
  R: 'Realista',
  I: 'Investigador',
  A: 'Artístico',
  S: 'Social',
  E: 'Emprendedor',
  C: 'Convencional',
};

export type VocItem = {
  id: string;
  text: string;
  dimension: VocDimension;
  order: number;
  isActive: boolean;
  updatedAt: string;
};

export type VocItemInput = {
  text: string;
  dimension: VocDimension;
  order: number;
  isActive: boolean;
};

export type VocItemListQuery = {
  dimension?: VocDimension;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type VocItemListPage = { items: VocItem[]; total: number; page: number; pageSize: number };

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useVocItems(query: VocItemListQuery) {
  return useQuery({
    queryKey: ['vocational-items', query],
    queryFn: async (): Promise<VocItemListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/content/vocational-items?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch vocational items failed');
      return (
        unwrapData<VocItemListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useVocItemMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['vocational-items'] });
  return {
    create: useMutation({
      mutationFn: (input: VocItemInput) =>
        sendJson('/api/admin/content/vocational-items', 'POST', input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<VocItemInput> }) =>
        sendJson(`/api/admin/content/vocational-items/${id}`, 'PATCH', input),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const res = await fetch(`/api/admin/content/vocational-items/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error');
        }
      },
      onSuccess,
    }),
  };
}
