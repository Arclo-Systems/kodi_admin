'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';

export type AchievementTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'limited';

// Condition union — espejo de backend achievement-condition.schema.ts (NO inventar tipos).
// `goal_met_streak_days` (derivado de daily_progresses.goal_met), NO `goal_streak_days`:
// ese campo de User es la META que el usuario elige. `videos_watched` salió del enum del
// backend (nunca tuvo contador real). Estar desalineado acá no da error: el panel dibujaba
// "undefined ≥ 28" para los logros de meta diaria.
export const COUNTER_FIELDS = ['streak_days', 'goal_met_streak_days'] as const;
export const COUNT_ENTITIES = [
  'correct_answers',
  'simulacros_completed',
  'practice_sessions_completed',
  'quick_sessions_completed',
  'duels_won',
  'arenas_won',
] as const;
export const LEAGUE_LEVELS = ['aprendiz', 'avanzado', 'experto', 'genio'] as const;
// Eventos que el motor emite de verdad (backend trigger-scope.ts): el backend
// rechaza un `event_once` con cualquier otro nombre.
export const ACHIEVEMENT_EVENTS = [
  'question_answered_correct',
  'practice_session_completed',
  'simulacro_completed',
  'game_mode_completed',
  'duel_won',
  'arena_won',
  'streak_updated',
  'league_promoted',
  'ai_explain_used',
  'founder_offer_claimed',
  'manual',
] as const;

export type CounterField = (typeof COUNTER_FIELDS)[number];
export type CountEntity = (typeof COUNT_ENTITIES)[number];
export type LeagueLevel = (typeof LEAGUE_LEVELS)[number];
export type AchievementEvent = (typeof ACHIEVEMENT_EVENTS)[number];

export type AchievementCondition =
  | { type: 'counter_gte'; field: CounterField; value: number }
  | { type: 'count_gte'; entity: CountEntity; value: number }
  | { type: 'event_once'; event: string }
  | { type: 'combo_reached'; value: number }
  | { type: 'league_reached'; level: LeagueLevel }
  | { type: 'manual' };

export type ConditionType = AchievementCondition['type'];

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: AchievementTier;
  kokosReward: number;
  xpReward: number;
  kolonesReward: number;
  iconUrl: string;
  condition: AchievementCondition;
  isOneTime: boolean;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
  unlockedBy: number;
};

export type AchievementInput = {
  code: string;
  name: string;
  description: string;
  tier: AchievementTier;
  kokosReward: number;
  xpReward: number;
  kolonesReward: number;
  iconUrl: string;
  condition: AchievementCondition;
  isOneTime: boolean;
  isActive: boolean;
};

export type AchievementListQuery = {
  tier?: AchievementTier;
  isActive?: boolean;
  search?: string;
  page: number;
  pageSize: number;
};

type AchievementListPage = {
  items: Achievement[];
  total: number;
  page: number;
  pageSize: number;
};

export type RegrantPreview = {
  achievementId: string;
  affectedUsers: number;
  kokosPerUser: number;
  xpPerUser: number;
  kolonesPerUser: number;
  totalKokos: number;
  totalXp: number;
  totalKolones: number;
};

export type RegrantResult = {
  granted: number;
  totalKokos: number;
  totalXp: number;
  totalKolones: number;
};

export function useAchievements(query: AchievementListQuery) {
  return useQuery({
    queryKey: ['achievements', query],
    queryFn: async (): Promise<AchievementListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      return (
        (await fetchJson<AchievementListPage>(
          `/api/admin/economy/achievements?${params}`,
        )) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useAchievement(id: string) {
  return useQuery({
    queryKey: ['achievement', id],
    enabled: !!id,
    queryFn: async (): Promise<Achievement | undefined> => {
      return fetchJson<Achievement>(`/api/admin/economy/achievements/${id}`);
    },
  });
}

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useAchievementMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: AchievementInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/achievements', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['achievements'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Omit<AchievementInput, 'code'> }) =>
        sendJson(`/api/admin/economy/achievements/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['achievements'] });
        qc.invalidateQueries({ queryKey: ['achievement', id] });
      },
    }),
  };
}

export function useRegrant(id: string, enabled: boolean) {
  const qc = useQueryClient();
  const preview = useQuery({
    queryKey: ['achievement-regrant-preview', id],
    enabled: enabled && !!id,
    queryFn: async (): Promise<RegrantPreview | undefined> => {
      return fetchJson<RegrantPreview>(
        `/api/admin/economy/achievements/${id}/regrant-preview`,
      );
    },
  });
  const run = useMutation({
    // La clave identifica ESTA operación: si el POST se reenvía (doble click, retry de red)
    // el backend la rebota y no vuelve a pagar. Un re-otorgamiento deliberado posterior
    // genera otra clave y sí paga de nuevo.
    mutationFn: (idempotencyKey: string) =>
      sendJson(`/api/admin/economy/achievements/${id}/regrant`, 'POST', { idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['achievement-regrant-preview', id] });
      qc.invalidateQueries({ queryKey: ['achievement', id] });
    },
  });
  return { preview, run };
}
