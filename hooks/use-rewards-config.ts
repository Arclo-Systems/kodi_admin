'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { hasOverlap } from '@/hooks/use-arena-especial';

/** Tramo de premio de la Arena Rápida: "del puesto X al Y". */
export type RapidaPrizeBracket = {
  minRank: number;
  maxRank: number;
  kolones: number;
  kokos: number;
  xp: number;
};

/** Puestos de una Rápida (tamaño de la sala). Espejo del backend. */
export const RAPIDA_MAX_RANK = 10;

/** `null` = válidos. Espejo de `rapidaPrizeBracketsProblem` del backend. */
export function rapidaBracketsProblem(brackets: RapidaPrizeBracket[]): string | null {
  for (const b of brackets) {
    if (b.minRank < 1 || b.maxRank < b.minRank)
      return 'Cada tramo va de un puesto a otro igual o mayor, desde el 1.';
    if (b.maxRank > RAPIDA_MAX_RANK) return `La Rápida tiene ${RAPIDA_MAX_RANK} puestos.`;
  }
  const snake = brackets.map((b) => ({ min_rank: b.minRank, max_rank: b.maxRank }));
  if (hasOverlap(snake)) return 'Dos tramos se solapan: un puesto cobraría dos veces.';
  return null;
}

// Matriz completa (decisión founder 2026-06-10): cada modo tiene XP + Kolones + Kokos,
// y todo XP acredita a la liga. Campo en 0 = ese premio no aplica.
export type RewardConfigValues = {
  practiceKolonesPerCorrect: number;
  practiceKokosPerCorrect: number;
  quickKolonesPerCorrect: number;
  quickKokosPerCorrect: number;
  /** Contrarreloj: XP extra por correcta en menos de 3 s. */
  quickSpeedBonusXp: number;
  /** Supervivencia: precio en Kokos de la segunda oportunidad. */
  reviveKokosPrice: number;
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
  /** Arena Rápida: premios por tramos de puesto. Vacío = no paga. */
  arenaRapidaPrizes: RapidaPrizeBracket[];
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
  kokosPerVideo: number;
  kolonesPerVideo: number;
  videoXp: number;
  /** Material de repaso: EXP por completar la sesión diaria de tarjetas. */
  flashcardSessionXp: number;
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
  quickSpeedBonusXp: 15,
  reviveKokosPrice: 80,
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
  arenaRapidaPrizes: [{ minRank: 1, maxRank: 1, kolones: 50, kokos: 30, xp: 0 }],
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
  kokosPerVideo: 1,
  kolonesPerVideo: 0,
  videoXp: 0,
  flashcardSessionXp: 15,
};

const countryQs = (country: string | null) => (country ? `?country=${country}` : '');

export function useRewardsConfig(country: string | null) {
  return useQuery({
    queryKey: ['rewards-config', country],
    queryFn: async (): Promise<RewardConfig | null> => {
      return (
        (await fetchJson<RewardConfig>(
          `/api/admin/economy/rewards/config${countryQs(country)}`,
        )) ?? null
      );
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
