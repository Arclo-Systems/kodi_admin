'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import type { ReportSeverity } from '@/hooks/use-moderation';

export type ProhibitedWord = {
  id: string;
  word: string;
  severity: ReportSeverity;
  isActive: boolean;
  createdAt: string;
};

export type ProhibitedWordInput = {
  word?: string;
  severity?: ReportSeverity;
  isActive?: boolean;
};

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<unknown> {
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

export function useProhibitedWords() {
  return useQuery({
    queryKey: ['moderation', 'prohibited-words'],
    queryFn: async (): Promise<ProhibitedWord[]> => {
      const res = await fetch('/api/admin/moderation/prohibited-words', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch prohibited words failed');
      return unwrapData<ProhibitedWord[]>(await res.json()) ?? [];
    },
  });
}

export function useProhibitedWordMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['moderation', 'prohibited-words'] });
  return {
    create: useMutation({
      mutationFn: (input: ProhibitedWordInput) =>
        send('/api/admin/moderation/prohibited-words', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProhibitedWordInput }) =>
        send(`/api/admin/moderation/prohibited-words/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/moderation/prohibited-words/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}
