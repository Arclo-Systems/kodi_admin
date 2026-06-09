'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type MrrByCountry = { country: string; currency: string; mrrCents: number };

export type MonetizationAnalytics = {
  newSubscriptions: number;
  cancelled: number;
  expired: number;
  trials: number;
  activePaid: number;
  paidShare: number; // 0..1, snapshot
  mrrEstimatedCents: Record<string, number>; // por moneda, mensual (total)
  mrrByCountry: MrrByCountry[]; // por país+moneda, mensual
  range: { from: string; to: string };
};

export type AnalyticsQuery = { from?: string; to?: string; country?: string[] };

export function useMonetizationAnalytics(q: AnalyticsQuery) {
  return useQuery({
    queryKey: ['monetization-analytics', q],
    queryFn: async (): Promise<MonetizationAnalytics | undefined> => {
      const params = new URLSearchParams();
      if (q.from) params.set('from', q.from);
      if (q.to) params.set('to', q.to);
      for (const c of q.country ?? []) params.append('country', c);
      const qs = params.toString();
      const res = await fetch(`/api/admin/monetization/analytics${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch monetization analytics failed');
      return unwrapData<MonetizationAnalytics>(await res.json());
    },
  });
}
