'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type EnergyConfig = {
  id: string;
  country: string | null;
  maxEnergy: number;
  regenMinutes: number;
  costPerMatch: number;
  adBonus: number;
  refillCostKokos: number;
  updatedAt: string;
};
export type EnergyConfigInput = {
  country: string | null;
  maxEnergy: number;
  regenMinutes: number;
  costPerMatch: number;
  adBonus: number;
  refillCostKokos: number;
};

export type FreeLimitConfig = {
  id: string;
  country: string | null;
  questionsPerVideo: number;
  maxVideosPerDay: number;
  updatedAt: string;
};
export type FreeLimitInput = {
  country: string | null;
  questionsPerVideo: number;
  maxVideosPerDay: number;
};

// Defaults del schema, para cuando el GET devuelve null (sin config para ese país).
export const ENERGY_DEFAULTS = {
  maxEnergy: 25,
  regenMinutes: 6,
  costPerMatch: 1,
  adBonus: 3,
  refillCostKokos: 50,
} as const;
export const FREE_LIMIT_DEFAULTS = {
  questionsPerVideo: 5,
  maxVideosPerDay: 3,
} as const;

const countryQs = (country: string | null) => (country ? `?country=${country}` : '');

async function putJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'PUT',
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

export function useEnergyConfig(country: string | null) {
  return useQuery({
    queryKey: ['energy-config', country],
    queryFn: async (): Promise<EnergyConfig | null> => {
      const res = await fetch(`/api/admin/economy/energy/config${countryQs(country)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch energy config failed');
      return unwrapData<EnergyConfig>(await res.json()) ?? null;
    },
  });
}

export function useFreeLimitConfig(country: string | null) {
  return useQuery({
    queryKey: ['free-limit-config', country],
    queryFn: async (): Promise<FreeLimitConfig | null> => {
      const res = await fetch(`/api/admin/economy/energy/free-limit${countryQs(country)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch free-limit config failed');
      return unwrapData<FreeLimitConfig>(await res.json()) ?? null;
    },
  });
}

export function useEnergyMutations() {
  const qc = useQueryClient();
  return {
    saveEnergy: useMutation({
      mutationFn: (input: EnergyConfigInput) =>
        putJson('/api/admin/economy/energy/config', input),
      onSuccess: (_d, input) =>
        qc.invalidateQueries({ queryKey: ['energy-config', input.country] }),
    }),
    saveFreeLimit: useMutation({
      mutationFn: (input: FreeLimitInput) =>
        putJson('/api/admin/economy/energy/free-limit', input),
      onSuccess: (_d, input) =>
        qc.invalidateQueries({ queryKey: ['free-limit-config', input.country] }),
    }),
  };
}
