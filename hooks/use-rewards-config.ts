'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// Matriz completa (decisión founder 2026-06-10): cada modo tiene XP + Kolones + Kokos,
// y todo XP acredita a la liga. Campo en 0 = ese premio no aplica.
export type RewardConfigValues = {
  practiceKolonesPerCorrect: number;
  practiceKokosPerCorrect: number;
  quickKolonesPerCorrect: number;
  quickKokosPerCorrect: number;
  surpriseExamBaseXp: number;
  surpriseExamWindowFactor: number;
  surpriseExamKolones: number;
  surpriseExamKokos: number;
  simulacroKolones: number;
  simulacroKokos: number;
  duelCompletionKolones: number;
  duelCompletionKokos: number;
  duelWinKolones: number;
  duelWinKokos: number;
  arenaRapidaKolones: number;
  arenaRapidaKokos: number;
  arenaRapidaXp: number;
  arenaAmigosKolones: number;
  arenaAmigosKokos: number;
  arenaAmigosXp: number;
  leagueXpPerCorrect: number;
  leagueXpSimulacro: number;
  leagueXpGameMode: number;
  leagueXpDuelWon: number;
  goalKolones: number;
  goalKokos: number;
  goalXp: number;
  streakKolones: number;
  streakKokos: number;
  streakLeagueXp: number;
  achievementKolones: number;
  achievementXp: number;
  kokosPerVideo: number;
  kolonesPerVideo: number;
  videoXp: number;
};

export type RewardConfig = RewardConfigValues & {
  id: string;
  country: string | null;
  updatedAt: string;
};

export type RewardConfigInput = RewardConfigValues & { country: string | null };

// Defaults del schema (= valores históricos): lo que rige cuando el GET devuelve null.
export const REWARD_DEFAULTS: RewardConfigValues = {
  practiceKolonesPerCorrect: 1,
  practiceKokosPerCorrect: 0,
  quickKolonesPerCorrect: 1,
  quickKokosPerCorrect: 0,
  surpriseExamBaseXp: 30,
  surpriseExamWindowFactor: 2,
  surpriseExamKolones: 0,
  surpriseExamKokos: 0,
  simulacroKolones: 20,
  simulacroKokos: 0,
  duelCompletionKolones: 5,
  duelCompletionKokos: 0,
  duelWinKolones: 5,
  duelWinKokos: 0,
  arenaRapidaKolones: 50,
  arenaRapidaKokos: 30,
  arenaRapidaXp: 0,
  arenaAmigosKolones: 0,
  arenaAmigosKokos: 0,
  arenaAmigosXp: 0,
  leagueXpPerCorrect: 10,
  leagueXpSimulacro: 50,
  leagueXpGameMode: 15,
  leagueXpDuelWon: 8,
  goalKolones: 10,
  goalKokos: 0,
  goalXp: 15,
  streakKolones: 5,
  streakKokos: 0,
  streakLeagueXp: 5,
  achievementKolones: 15,
  achievementXp: 0,
  kokosPerVideo: 1,
  kolonesPerVideo: 0,
  videoXp: 0,
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
