'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type KokosPack = {
  id: string;
  slug: string;
  name: string;
  amount: number;
  storeProductId: string;
  priceUsdCents: number;
  offerPriceUsdCents: number | null;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type KokosPackInput = {
  slug: string;
  name: string;
  amount: number;
  storeProductId: string;
  priceUsdCents: number;
  offerPriceUsdCents: number | null;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type KokosPackUpdate = {
  name?: string;
  amount?: number;
  priceUsdCents?: number;
  offerPriceUsdCents?: number | null;
  offerStartsAt?: string | null;
  offerEndsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type OfferStatus = 'none' | 'active' | 'scheduled' | 'expired';

// Estado de la oferta para el display del admin (la app usa el catálogo del backend).
export function offerStatus(
  p: Pick<KokosPack, 'offerPriceUsdCents' | 'offerStartsAt' | 'offerEndsAt'>,
): OfferStatus {
  if (p.offerPriceUsdCents == null) return 'none';
  const now = Date.now();
  const start = p.offerStartsAt ? Date.parse(p.offerStartsAt) : null;
  const end = p.offerEndsAt ? Date.parse(p.offerEndsAt) : null;
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'expired';
  return 'active';
}

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
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

export function useKokosPacks() {
  return useQuery({
    queryKey: ['kokos-packs'],
    queryFn: async (): Promise<KokosPack[]> => {
      const res = await fetch('/api/admin/monetization/kokos-packs', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch kokos-packs failed');
      return unwrapData<KokosPack[]>(await res.json()) ?? [];
    },
  });
}

export function useKokosPackMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['kokos-packs'] });
  return {
    create: useMutation({
      mutationFn: (input: KokosPackInput) =>
        send('/api/admin/monetization/kokos-packs', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: KokosPackUpdate }) =>
        send(`/api/admin/monetization/kokos-packs/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
  };
}
