'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type AchievementTier = 'common' | 'uncommon' | 'rare' | 'epic';

// Condition union — espejo de backend achievement-condition.schema.ts (NO inventar tipos).
export const COUNTER_FIELDS = ['streak_days', 'goal_streak_days'] as const;
export const COUNT_ENTITIES = [
  'correct_answers',
  'simulacros_completed',
  'practice_sessions_completed',
  'quick_sessions_completed',
  'duels_won',
  'arenas_won',
  'videos_watched',
] as const;
export const LEAGUE_LEVELS = ['aprendiz', 'avanzado', 'experto', 'genio'] as const;

export type CounterField = (typeof COUNTER_FIELDS)[number];
export type CountEntity = (typeof COUNT_ENTITIES)[number];
export type LeagueLevel = (typeof LEAGUE_LEVELS)[number];

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
  kokosPerUser: number;
  affectedUsers: number;
  totalKokos: number;
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
      const res = await fetch(`/api/admin/economy/achievements?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch achievements failed');
      return (
        unwrapData<AchievementListPage>(await res.json()) ?? {
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
      const res = await fetch(`/api/admin/economy/achievements/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch achievement failed');
      return unwrapData<Achievement>(await res.json());
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
      const res = await fetch(`/api/admin/economy/achievements/${id}/regrant-preview`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch regrant preview failed');
      return unwrapData<RegrantPreview>(await res.json());
    },
  });
  const run = useMutation({
    mutationFn: () => sendJson(`/api/admin/economy/achievements/${id}/regrant`, 'POST', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['achievement-regrant-preview', id] });
      qc.invalidateQueries({ queryKey: ['achievement', id] });
    },
  });
  return { preview, run };
}
