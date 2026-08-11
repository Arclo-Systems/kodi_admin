'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type QuickMode = 'contrarreloj' | 'supervivencia';

export type ModeRankingRow = {
  position: number;
  userId: string;
  displayName: string;
  /** false = la app lo muestra como «Anónimo»; el panel ve el nombre real igual. */
  showInRankings: boolean;
  bestScore: number;
  bestCombo: number;
  updatedAt: string;
};

export type ModeRanking = { totalPlayers: number; items: ModeRankingRow[] };

/** Cada combinación es una tabla distinta, igual que en la app. */
export type ModeRankingFilters = {
  moduleId: string;
  country: string;
  examSubjectId: string | null;
};

/**
 * Récords históricos de Contrarreloj y Supervivencia. Solo lectura: no se
 * reinician ni se editan, así que no hay mutaciones ni invalidación asociada.
 */
export function useModeRanking(mode: QuickMode, filters: ModeRankingFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['game', 'modes', mode, 'ranking', filters],
    enabled,
    queryFn: async (): Promise<ModeRanking> => {
      const qs = new URLSearchParams({
        module_id: filters.moduleId,
        country: filters.country,
      });
      if (filters.examSubjectId) qs.set('exam_subject_id', filters.examSubjectId);
      const res = await fetch(`/api/admin/game/modes/${mode}/ranking?${qs.toString()}`, {
        credentials: 'include',
      });
      // El mensaje del backend importa: un 403 acá significa «ese país está
      // fuera de tu scope», y decirlo evita que se lea como una tabla vacía.
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'No se pudo cargar el ranking');
      }
      return unwrapData<ModeRanking>(await res.json()) ?? { totalPlayers: 0, items: [] };
    },
  });
}
