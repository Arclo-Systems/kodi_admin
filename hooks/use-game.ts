'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type GameEntity = 'matches' | 'arenas' | 'simulacros' | 'quick-modes';

export type GameListFilters = {
  status?: string;
  moduleId?: string;
  type?: string;
  page?: number;
};

type Player = { id: string; displayName: string; isBot: boolean } | null;
type ModuleRef = { shortName: string; country: string };

export type Suspicion = {
  userId: string;
  total: number;
  fastCorrect: number;
  fastCorrectRate: number;
  maxFastStreak: number;
  speedSuspicious: boolean;
  patternSuspicious: boolean;
};

export type MatchRow = {
  id: string;
  status: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  annulledAt: string | null;
  module: ModuleRef;
  player1: Player;
  player2: Player;
};

export type ArenaRow = {
  id: string;
  type: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  participantCount: number;
  annulledAt: string | null;
  module: ModuleRef;
};

export type SimulacroRow = {
  id: string;
  status: string;
  totalQuestions: number;
  score: string | null;
  startedAt: string;
  endedAt: string | null;
  annulledAt: string | null;
  user: { id: string; displayName: string };
  module: ModuleRef;
};

export type QuickModeRow = {
  id: string;
  type: string;
  status: string;
  questionsAnswered: number;
  questionsCorrect: number;
  kolonesEarned: number;
  startedAt: string;
  endedAt: string | null;
  annulledAt: string | null;
  user: { id: string; displayName: string };
  module: ModuleRef;
};

export type GameDetail = {
  id: string;
  status: string;
  annulledAt: string | null;
  annulReason?: string | null;
  module: { shortName: string; fullName: string; country: string };
  suspicion: Suspicion[];
  // comunes (la respuesta ya los trae; tipados para la cabecera/stats)
  startedAt?: string | null;
  endedAt?: string | null;
  mode?: string;
  durationMinutes?: number | null;
  totalQuestions?: number;
  // específicos por modo (opcionales)
  player1?: Player;
  player2?: Player;
  winner?: { id: string; displayName: string } | null;
  turns?: {
    turnNumber: number;
    playerId: string | null;
    status: string;
    questionsAnswered: number;
    allCorrect: boolean;
  }[];
  subjects?: { subjectId: string; crownHolderId: string | null; subject: { name: string } }[];
  participants?: {
    userId: string;
    finalRank: number | null;
    isBot: boolean;
    eliminatedAt: string | null;
    user: { displayName: string };
  }[];
  user?: { id: string; displayName: string; isBot: boolean };
  aiAnalysis?: string | null;
  score?: string | null;
  subjectResults?: {
    subjectId: string;
    questionsTotal: number;
    questionsCorrect: number;
    score: string;
    subject: { name: string };
  }[];
  // QuickMode (contrarreloj/supervivencia)
  type?: string;
  questionsAnswered?: number;
  questionsCorrect?: number;
  maxCombo?: number;
  livesRemaining?: number | null;
  kolonesEarned?: number;
  xpEarned?: number;
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

export function useGameList<T>(entity: GameEntity, filters: GameListFilters) {
  return useQuery({
    queryKey: ['game', entity, filters],
    queryFn: async (): Promise<ListResponse<T>> => {
      const qs = new URLSearchParams();
      if (filters.status) qs.set('status', filters.status);
      if (filters.moduleId) qs.set('moduleId', filters.moduleId);
      if (filters.type) qs.set('type', filters.type);
      if (filters.page) qs.set('page', String(filters.page));
      const res = await fetch(`/api/admin/game/${entity}?${qs.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch game list failed');
      return (
        unwrapData<ListResponse<T>>(await res.json()) ?? {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
        }
      );
    },
  });
}

export function useGameDetail(entity: GameEntity, id: string) {
  return useQuery({
    queryKey: ['game', entity, 'detail', id],
    queryFn: async (): Promise<GameDetail> => {
      const res = await fetch(`/api/admin/game/${entity}/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch game detail failed');
      const data = unwrapData<GameDetail>(await res.json());
      if (!data) throw new Error('not found');
      return data;
    },
  });
}

export function useAnnul(entity: GameEntity) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/game/${entity}/${id}/annul`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'No se pudo anular');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', entity] }),
  });
}
