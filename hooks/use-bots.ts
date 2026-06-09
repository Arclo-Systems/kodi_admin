'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type BotTemplate = {
  id: string;
  difficulty: string;
  name: string;
  accuracyMin: number;
  accuracyMax: number;
  responseTimeMsMin: number;
  responseTimeMsMax: number;
  isActive: boolean;
};

export type BotRow = {
  id: string;
  displayName: string;
  country: string;
  accountStatus: string;
  botConfig: {
    accuracy: number;
    isActive: boolean;
    template: { difficulty: string; name: string };
  } | null;
};

export type BotAvatar = { id: string; url: string; isActive: boolean };
export type BotName = { id: string; name: string; country: string; isActive: boolean };
export type BotMetric = {
  country: string;
  date: string;
  botWins: number;
  total: number;
  winRate: number;
  alarmed: boolean;
};

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('fetch failed');
  return unwrapData<T>(await res.json()) as T;
}

async function send(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

// ─── Bots ──────────────────────────────────────────────────────────────────
export function useBots(filters: { templateId?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['bots', filters],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filters.templateId) qs.set('templateId', filters.templateId);
      if (filters.isActive !== undefined) qs.set('isActive', String(filters.isActive));
      return get<{ items: BotRow[]; total: number }>(`/api/admin/bots?${qs}`);
    },
  });
}

export function useBotMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bots'] });
  return {
    create: useMutation({
      mutationFn: (b: { displayName: string; country: string; templateId: string }) =>
        send('/api/admin/bots', 'POST', b),
      onSuccess: invalidate,
    }),
    bulk: useMutation({
      mutationFn: (b: { country: string; count: number; templateId: string }) =>
        send('/api/admin/bots/bulk', 'POST', b),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { isActive?: boolean; templateId?: string } }) =>
        send(`/api/admin/bots/${id}`, 'PATCH', body),
      onSuccess: invalidate,
    }),
  };
}

// ─── Templates ───────────────────────────────────────────────────────────────
export function useTemplates() {
  return useQuery({ queryKey: ['bot-templates'], queryFn: () => get<BotTemplate[]>('/api/admin/bots/templates') });
}
export function useTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<BotTemplate> }) =>
      send(`/api/admin/bots/templates/${id}`, 'PATCH', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-templates'] }),
  });
}

// ─── Pools ─────────────────────────────────────────────────────────────────
export function useAvatars() {
  return useQuery({ queryKey: ['bot-avatars'], queryFn: () => get<BotAvatar[]>('/api/admin/bots/avatars') });
}
export function useAvatarMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bot-avatars'] });
  return {
    create: useMutation({ mutationFn: (url: string) => send('/api/admin/bots/avatars', 'POST', { url }), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => send(`/api/admin/bots/avatars/${id}`, 'DELETE'), onSuccess: invalidate }),
  };
}
export function useNames(country?: string) {
  return useQuery({
    queryKey: ['bot-names', country ?? 'all'],
    queryFn: () => get<BotName[]>(`/api/admin/bots/names${country ? `?country=${country}` : ''}`),
  });
}
export function useNameMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bot-names'] });
  return {
    create: useMutation({ mutationFn: (b: { name: string; country: string }) => send('/api/admin/bots/names', 'POST', b), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => send(`/api/admin/bots/names/${id}`, 'DELETE'), onSuccess: invalidate }),
  };
}

// ─── Métricas ────────────────────────────────────────────────────────────────
export function useBotMetrics() {
  return useQuery({ queryKey: ['bot-metrics'], queryFn: () => get<BotMetric[]>('/api/admin/bots/metrics') });
}
