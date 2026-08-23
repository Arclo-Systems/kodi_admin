'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

/**
 * Escala de METAS de racha (A21): las opciones que el usuario elige en el
 * onboarding y en el perfil, y los Kolones que gana al alcanzarlas.
 *
 * No confundir con `streakKolones` de Recompensas, que es el premio de CADA
 * día de racha.
 */
export type StreakGoalTier = {
  id: string;
  days: number;
  kolones: number;
  /** Copy, no economía: "X veces más probable que apruebes tu examen". */
  multiplier: number;
  isActive: boolean;
  updatedAt: string;
};

export type StreakGoalTierInput = {
  days: number;
  kolones: number;
  multiplier: number;
  isActive: boolean;
};

export type StreakGoalsInput = {
  country: string | null;
  tiers: StreakGoalTierInput[];
};

const countryQs = (country: string | null) => (country ? `?country=${country}` : '');

export function useStreakGoals(country: string | null) {
  return useQuery({
    queryKey: ['streak-goals', country],
    queryFn: async (): Promise<StreakGoalTier[]> => {
      return (
        (await fetchJson<StreakGoalTier[]>(
          `/api/admin/economy/streak-goals${countryQs(country)}`,
        )) ?? []
      );
    },
  });
}

export function useStreakGoalsMutations() {
  const qc = useQueryClient();
  return {
    // La escala se guarda ENTERA: el backend reemplaza en una transacción, así
    // que la app nunca ve una lista a medio actualizar.
    saveGoals: useMutation({
      mutationFn: async (input: StreakGoalsInput) => {
        const res = await fetch('/api/admin/economy/streak-goals', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error guardando las metas de racha');
        }
        return res.json().catch(() => ({}));
      },
      onSuccess: (_d, input) =>
        qc.invalidateQueries({ queryKey: ['streak-goals', input.country] }),
    }),
  };
}
