'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type PriceMode = 'explicit' | 'percent';

/** Monedas de los mercados donde opera Kodi (mismo enum que el backend). */
export const OFFER_CURRENCIES = ['USD', 'CRC', 'GTQ', 'HNL', 'PAB'] as const;
export type OfferCurrency = (typeof OFFER_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<OfferCurrency, string> = {
  USD: 'USD — dólar',
  CRC: 'CRC — colón',
  GTQ: 'GTQ — quetzal',
  HNL: 'HNL — lempira',
  PAB: 'PAB — balboa',
};

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
  /** Moneda del grid de la oferta; puede diferir de la del grid regular. */
  currency: OfferCurrency;
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
  currency?: OfferCurrency;
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
      return (await fetchJson<PromoOffer[]>(BASE)) ?? [];
    },
  });
}

export function usePromoOffer(id: string | null) {
  return useQuery({
    queryKey: ['promo-offer', id],
    enabled: !!id,
    queryFn: async (): Promise<PromoOfferDetail | null> => {
      return (await fetchJson<PromoOfferDetail>(`${BASE}/${id}`)) ?? null;
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
