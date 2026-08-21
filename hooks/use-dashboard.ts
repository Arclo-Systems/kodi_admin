'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

// Tipos espejo de las interfaces del backend (DashboardAdminService). El envelope {data}
// no está en el OpenAPI → se desenvuelve en fetchJson; los tipos se mantienen a mano.
export type EngagementKpis = {
  activeUsers: { dau: number; wau: number; mau: number };
  newUsers: number;
  practiceSessions: number;
  questionsAnswered: number;
  range: { from: string; to: string };
};

export type EconomyKpis = {
  kokos: { granted: number; spent: number };
  storePurchases: number;
  couponRedemptions: number;
  raffleAwards: number;
  range: { from: string; to: string };
};

export type SubscribersKpis = {
  byPlan: { plan: string; count: number }[];
  total: number;
};

export type TimeseriesPoint = { date: string; newUsers: number; practiceSessions: number };
export type TimeseriesResult = { points: TimeseriesPoint[]; range: { from: string; to: string } };

export type RetentionResult = {
  cohortSize: number;
  d1: { count: number; rate: number };
  d7: { count: number; rate: number };
  range: { from: string; to: string };
};

export type AcquisitionResult = {
  breakdown: { source: string; count: number }[];
  range: { from: string; to: string };
};

export type DashboardQuery = {
  from?: string; // ISO
  to?: string; // ISO
  country?: string[];
};

function buildParams(q: DashboardQuery): string {
  const params = new URLSearchParams();
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  for (const c of q.country ?? []) params.append('country', c); // repetido → array en el backend
  return params.toString();
}

function useDashboardSection<T>(section: string, q: DashboardQuery) {
  return useQuery({
    queryKey: ['dashboard', section, q],
    queryFn: async (): Promise<T | undefined> => {
      const qs = buildParams(q);
      return fetchJson<T>(
        `/api/admin/dashboard/${section}${qs ? `?${qs}` : ''}`,
      );
    },
  });
}

export const useEngagement = (q: DashboardQuery) =>
  useDashboardSection<EngagementKpis>('engagement', q);
export const useEconomy = (q: DashboardQuery) => useDashboardSection<EconomyKpis>('economy', q);
export const useSubscribers = (q: DashboardQuery) =>
  useDashboardSection<SubscribersKpis>('subscribers', q);
export const useTimeseries = (q: DashboardQuery) =>
  useDashboardSection<TimeseriesResult>('timeseries', q);
export const useRetention = (q: DashboardQuery) =>
  useDashboardSection<RetentionResult>('retention', q);
export const useAcquisition = (q: DashboardQuery) =>
  useDashboardSection<AcquisitionResult>('acquisition', q);
export type SubscribersByPeriodResult = {
  monthly: number;
  quarterly: number;
  yearly: number;
};
export const useSubscribersByPeriod = (q: DashboardQuery) =>
  useDashboardSection<SubscribersByPeriodResult>('subscribers-by-period', q);

export type UsersByModuleResult = {
  modules: {
    moduleId: string;
    name: string;
    total: number;
    free: number;
    basico: number;
    plus: number;
    pro: number;
  }[];
  range: { from: string; to: string };
};
export const useUsersByModule = (q: DashboardQuery) =>
  useDashboardSection<UsersByModuleResult>('users-by-module', q);
