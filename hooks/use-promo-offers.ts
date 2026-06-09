'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type PriceMode = 'explicit' | 'percent';

export type OfferPrice = {
  id: string;
  plan: string;
  period: string;
  packSize: number;
  priceCents: number;
};

export type PromoOffer = {
  id: string;
  slug: string;
  label: string;
  country: string;
  priceMode: PriceMode;
  discountPercent: number | null;
  slotsTotal: number;
  slotsClaimed: number;
  startsAt: string | null;
  endsAt: string | null;
  badgeItemId: string | null;
  isActive: boolean;
  _count?: { claims: number; prices: number };
};

export type PromoOfferDetail = PromoOffer & { prices: OfferPrice[] };

export type CreateOfferInput = {
  slug: string;
  label: string;
  country: string;
  priceMode: PriceMode;
  discountPercent?: number | null;
  slotsTotal: number;
  startsAt?: string | null;
  endsAt?: string | null;
  badgeItemId?: string | null;
  isActive?: boolean;
};

export type UpdateOfferInput = Partial<Omit<CreateOfferInput, 'slug' | 'country'>>;

export type PriceRow = { plan: string; period: string; packSize: number; priceCents: number };

async function send(url: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown): Promise<unknown> {
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

const BASE = '/api/admin/monetization/promo-offers';

export function usePromoOffers() {
  return useQuery({
    queryKey: ['promo-offers'],
    queryFn: async (): Promise<PromoOffer[]> => {
      const res = await fetch(BASE, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch promo-offers failed');
      return unwrapData<PromoOffer[]>(await res.json()) ?? [];
    },
  });
}

export function usePromoOffer(id: string | null) {
  return useQuery({
    queryKey: ['promo-offer', id],
    enabled: !!id,
    queryFn: async (): Promise<PromoOfferDetail | null> => {
      const res = await fetch(`${BASE}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch promo-offer failed');
      return unwrapData<PromoOfferDetail>(await res.json()) ?? null;
    },
  });
}

export function usePromoOfferMutations() {
  const qc = useQueryClient();
  const invalidate = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['promo-offers'] });
    if (id) qc.invalidateQueries({ queryKey: ['promo-offer', id] });
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateOfferInput) => send(BASE, 'POST', input),
      onSuccess: () => invalidate(),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateOfferInput }) =>
        send(`${BASE}/${id}`, 'PATCH', input),
      onSuccess: (_d, { id }) => invalidate(id),
    }),
    setPrices: useMutation({
      mutationFn: ({ id, prices }: { id: string; prices: PriceRow[] }) =>
        send(`${BASE}/${id}/prices`, 'PUT', { prices }),
      onSuccess: (_d, { id }) => invalidate(id),
    }),
  };
}
