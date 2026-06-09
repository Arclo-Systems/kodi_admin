'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type SubscriptionPrice = {
  id: string;
  country: string | null; // null = Default
  plan: string;
  period: string;
  packSize: number;
  priceCents: number;
  currency: string;
  updatedAt: string;
};

export type SubscriptionPriceInput = {
  country: string | null;
  plan: string;
  period: string;
  packSize: number;
  priceCents: number;
  currency: string;
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

const BASE = '/api/admin/monetization/subscription-prices';

export function useSubscriptionPrices() {
  return useQuery({
    queryKey: ['subscription-prices'],
    queryFn: async (): Promise<SubscriptionPrice[]> => {
      const res = await fetch(BASE, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch subscription-prices failed');
      return unwrapData<SubscriptionPrice[]>(await res.json()) ?? [];
    },
  });
}

export function useSubscriptionPriceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscription-prices'] });
  return {
    create: useMutation({
      mutationFn: (input: SubscriptionPriceInput) => send(BASE, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: { priceCents?: number; currency?: string } }) =>
        send(`${BASE}/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`${BASE}/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}
