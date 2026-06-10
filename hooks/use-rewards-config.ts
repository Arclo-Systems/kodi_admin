'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// Regla del modelo (unificación 2026-06-10): TODO XP acredita a la liga — un solo
// campo por concepto; el XP por correcta de práctica/rápidos es leagueXpPerCorrect.
export type RewardConfigValues = {
  practiceKolonesPerCorrect: number;
  quickKolonesPerCorrect: number;
  surpriseExamBaseXp: number;
  surpriseExamWindowFactor: number;
  surpriseExamKolones: number;
  simulacroKolones: number;
  duelCompletionKolones: number;
  duelWinKolones: number;
  arenaRapidaKolones: number;
  arenaRapidaKokos: number;
  arenaAmigosKolones: number;
  arenaAmigosKokos: number;
  leagueXpPerCorrect: number;
  leagueXpSimulacro: number;
  leagueXpGameMode: number;
  leagueXpDuelWon: number;
  goalKolones: number;
  goalXp: number;
  streakKolones: number;
  streakLeagueXp: number;
  achievementKolones: number;
  kokosPerVideo: number;
};

export type RewardConfig = RewardConfigValues & {
  id: string;
  country: string | null;
  updatedAt: string;
};

export type RewardConfigInput = RewardConfigValues & { country: string | null };

// Defaults del schema (= valores históricos hardcodeados): lo que rige cuando el GET
// devuelve null para ese país.
export const REWARD_DEFAULTS: RewardConfigValues = {
  practiceKolonesPerCorrect: 1,
  quickKolonesPerCorrect: 1,
  surpriseExamBaseXp: 30,
  surpriseExamWindowFactor: 2,
  surpriseExamKolones: 0,
  simulacroKolones: 20,
  duelCompletionKolones: 5,
  duelWinKolones: 5,
  arenaRapidaKolones: 50,
  arenaRapidaKokos: 30,
  arenaAmigosKolones: 0,
  arenaAmigosKokos: 0,
  leagueXpPerCorrect: 10,
  leagueXpSimulacro: 50,
  leagueXpGameMode: 15,
  leagueXpDuelWon: 8,
  goalKolones: 10,
  goalXp: 15,
  streakKolones: 5,
  streakLeagueXp: 5,
  achievementKolones: 15,
  kokosPerVideo: 1,
};

const countryQs = (country: string | null) => (country ? `?country=${country}` : '');

export function useRewardsConfig(country: string | null) {
  return useQuery({
    queryKey: ['rewards-config', country],
    queryFn: async (): Promise<RewardConfig | null> => {
      const res = await fetch(`/api/admin/economy/rewards/config${countryQs(country)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch rewards config failed');
      return unwrapData<RewardConfig>(await res.json()) ?? null;
    },
  });
}

export function useRewardsMutations() {
  const qc = useQueryClient();
  return {
    saveRewards: useMutation({
      mutationFn: async (input: RewardConfigInput) => {
        const res = await fetch('/api/admin/economy/rewards/config', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error guardando recompensas');
        }
        return res.json().catch(() => ({}));
      },
      onSuccess: (_d, input) =>
        qc.invalidateQueries({ queryKey: ['rewards-config', input.country] }),
    }),
  };
}
