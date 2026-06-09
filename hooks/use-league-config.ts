'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const LEAGUE_TIERS = ['aprendiz', 'avanzado', 'experto', 'genio'] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const LEAGUE_TIER_LABELS: Record<LeagueTier, string> = {
  aprendiz: 'Aprendiz',
  avanzado: 'Avanzado',
  experto: 'Experto',
  genio: 'Genio',
};

export type RewardSpec = {
  kokos: number;
  kolones: number;
  items?: { itemId: string; quantity?: number }[];
};

export type LeagueConfig = {
  id: string;
  leagueLevel: LeagueTier;
  country: string | null;
  promotePct: number;
  promoteCap: number;
  demotePct: number;
  demoteCap: number;
  rewardTop3: RewardSpec;
  rewardTop4to10: RewardSpec;
  rewardRest: RewardSpec;
  insigniaItemId: string | null;
  updatedAt: string;
};

export type LeagueConfigInput = Omit<LeagueConfig, 'id' | 'updatedAt'>;

export function useLeagueConfigs(country: string | null) {
  return useQuery({
    queryKey: ['league-configs', country],
    queryFn: async (): Promise<LeagueConfig[]> => {
      const qs = country ? `?country=${country}` : '';
      const res = await fetch(`/api/admin/leagues/config${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch league configs failed');
      return unwrapData<{ items: LeagueConfig[] }>(await res.json())?.items ?? [];
    },
  });
}

export function useUpsertLeagueConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeagueConfigInput): Promise<void> => {
      const res = await fetch('/api/admin/leagues/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['league-configs'] }),
  });
}
