'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import type { LeagueTier } from './use-league-config';

export type LeagueOutcome = 'promoted' | 'stayed' | 'demoted';

export type LeagueStandingRow = {
  position: number;
  userId: string;
  displayName: string;
  /** false = la app lo muestra como «Anónimo»; el panel ve el nombre real igual. */
  showInRankings: boolean;
  xpThisCycle: number;
  isFirstCycle: boolean;
  /** Se llenan al cerrar el ciclo: durante la semana viajan en null. */
  finalRank: number | null;
  outcome: LeagueOutcome | null;
  updatedAt: string;
};

export type LeagueCycleInfo = {
  isoYear: number;
  isoWeek: number;
  startedAt: string;
  endsAt: string;
};

export type LeagueStandings = {
  /** null = todavía no hay ciclo abierto para esta semana. */
  cycle: LeagueCycleInfo | null;
  totalPlayers: number;
  items: LeagueStandingRow[];
};

/** Cada combinación es una lista distinta, igual que en la app. */
export type LeagueStandingsFilters = {
  moduleId: string;
  country: string;
  leagueLevel: LeagueTier;
};

/**
 * Tabla del ciclo vigente de una liga. Solo lectura: el panel no edita
 * membresías, así que no hay mutaciones ni invalidación asociada.
 */
export function useLeagueStandings(filters: LeagueStandingsFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['leagues', 'standings', filters],
    enabled,
    queryFn: async (): Promise<LeagueStandings> => {
      const qs = new URLSearchParams({
        module_id: filters.moduleId,
        country: filters.country,
        league_level: filters.leagueLevel,
      });
      const res = await fetch(`/api/admin/leagues/standings?${qs.toString()}`, {
        credentials: 'include',
      });
      // El mensaje del backend importa: un 403 acá significa «ese país está
      // fuera de tu scope», y decirlo evita que se lea como una tabla vacía.
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'No se pudo cargar la tabla');
      }
      return (
        unwrapData<LeagueStandings>(await res.json()) ?? {
          cycle: null,
          totalPlayers: 0,
          items: [],
        }
      );
    },
  });
}
