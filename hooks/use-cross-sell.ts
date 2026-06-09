'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type CrossSell = {
  id: string;
  sourceModuleId: string;
  targetModuleId: string;
  message: string;
  priority: number;
  isActive: boolean;
};

export type CrossSellInput = {
  sourceModuleId: string;
  targetModuleId: string;
  message: string;
  priority: number;
  isActive: boolean;
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

export function useCrossSell() {
  return useQuery({
    queryKey: ['cross-sell'],
    queryFn: async (): Promise<CrossSell[]> => {
      const res = await fetch('/api/admin/monetization/cross-sell', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch cross-sell failed');
      return unwrapData<CrossSell[]>(await res.json()) ?? [];
    },
  });
}

export function useCrossSellMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cross-sell'] });
  return {
    create: useMutation({
      mutationFn: (input: CrossSellInput) => send('/api/admin/monetization/cross-sell', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: { message?: string; priority?: number; isActive?: boolean } }) =>
        send(`/api/admin/monetization/cross-sell/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/monetization/cross-sell/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}
