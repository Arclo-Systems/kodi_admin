'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const MISSION_TYPES = [
  'answer_correct_in_subject',
  'complete_practice_session',
  'win_duel',
  'complete_simulacro',
  'maintain_streak',
  'play_with_friend',
] as const;

export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  answer_correct_in_subject: 'Responder correctas en materia',
  complete_practice_session: 'Completar práctica',
  win_duel: 'Ganar duelo',
  complete_simulacro: 'Completar simulacro',
  maintain_streak: 'Mantener racha',
  play_with_friend: 'Jugar con amigo',
};

export const MISSION_CADENCES = ['daily', 'weekly'] as const;

export type MissionCadence = (typeof MISSION_CADENCES)[number];

export const MISSION_CADENCE_LABELS: Record<MissionCadence, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
};

export type MissionTemplate = {
  id: string;
  type: MissionType;
  cadence: MissionCadence;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  kokosReward: number;
  kolonesReward: number;
  country: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
  timesAssigned?: number;
};

export type MissionTemplateInput = {
  type: MissionType;
  cadence: MissionCadence;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  kokosReward: number;
  kolonesReward: number;
  country: string | null;
  isActive: boolean;
};

export type MissionTemplateListQuery = {
  type?: MissionType;
  country?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type TemplateListPage = {
  items: MissionTemplate[];
  total: number;
  page: number;
  pageSize: number;
};

export type RefreshConfig = {
  id: string;
  country: string | null;
  kokosCost: number;
  dailyLimit: number;
  videoLimit: number;
  updatedAt: string;
};

export type RefreshConfigInput = {
  country: string | null;
  kokosCost: number;
  dailyLimit: number;
  videoLimit: number;
};

export type UserMission = {
  id: string;
  type: MissionType;
  date: string;
  targetCount: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  xpReward: number;
  kokosReward: number;
  kolonesReward: number;
};

async function sendJson(url: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown): Promise<unknown> {
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

// ─── Templates ──────────────────────────────────────────────────────────────

export function useMissionTemplates(query: MissionTemplateListQuery) {
  return useQuery({
    queryKey: ['mission-templates', query],
    queryFn: async (): Promise<TemplateListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/missions/templates?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch mission templates failed');
      return (
        unwrapData<TemplateListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useMissionTemplate(id: string) {
  return useQuery({
    queryKey: ['mission-template', id],
    enabled: !!id,
    queryFn: async (): Promise<MissionTemplate | undefined> => {
      const res = await fetch(`/api/admin/economy/missions/templates/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch mission template failed');
      return unwrapData<MissionTemplate>(await res.json());
    },
  });
}

export function useMissionTemplateMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: MissionTemplateInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/missions/templates', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['mission-templates'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<MissionTemplateInput> }) =>
        sendJson(`/api/admin/economy/missions/templates/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['mission-templates'] });
        qc.invalidateQueries({ queryKey: ['mission-template', id] });
      },
    }),
  };
}

// ─── Refresh config ─────────────────────────────────────────────────────────

export function useRefreshConfig(country: string | null) {
  return useQuery({
    queryKey: ['mission-refresh-config', country],
    queryFn: async (): Promise<RefreshConfig | null> => {
      const qs = country ? `?country=${country}` : '';
      const res = await fetch(`/api/admin/economy/missions/refresh-config${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch refresh config failed');
      return unwrapData<RefreshConfig | null>(await res.json()) ?? null;
    },
  });
}

export function useRefreshConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RefreshConfigInput) =>
      sendJson('/api/admin/economy/missions/refresh-config', 'PUT', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mission-refresh-config'] }),
  });
}

// ─── Intervención ─────────────────────────────────────────────────────────────

export function useUserMissions(friendCode: string, enabled: boolean) {
  return useQuery({
    queryKey: ['user-missions', friendCode],
    enabled: enabled && !!friendCode,
    queryFn: async (): Promise<UserMission[]> => {
      const res = await fetch(
        `/api/admin/economy/missions/user/${encodeURIComponent(friendCode)}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error('fetch user missions failed');
      return unwrapData<UserMission[]>(await res.json()) ?? [];
    },
  });
}

type InterventionArgs = { missionId: string; reason: string };

export function useMissionIntervention(friendCode: string) {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['user-missions', friendCode] });
  const complete = useMutation({
    mutationFn: ({ missionId, reason }: InterventionArgs) =>
      sendJson(`/api/admin/economy/missions/${missionId}/complete`, 'POST', { reason }),
    onSuccess,
  });
  const reset = useMutation({
    mutationFn: ({ missionId, reason }: InterventionArgs) =>
      sendJson(`/api/admin/economy/missions/${missionId}/reset`, 'POST', { reason }),
    onSuccess,
  });
  const substitute = useMutation({
    mutationFn: ({ missionId, reason }: InterventionArgs) =>
      sendJson(`/api/admin/economy/missions/${missionId}/substitute`, 'POST', { reason }),
    onSuccess,
  });
  return { complete, reset, substitute };
}
