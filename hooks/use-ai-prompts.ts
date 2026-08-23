'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';

export type AiPromptListItem = {
  id: string;
  key: string;
  country: string | null;
  description: string;
  activeVersionId: string | null;
  _count: { versions: number };
};

export type AiPromptVersion = {
  id: string;
  version: number;
  systemText: string;
  variables: string[];
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type AiPromptDetail = {
  id: string;
  key: string;
  country: string | null;
  description: string;
  activeVersionId: string | null;
  versions: AiPromptVersion[];
};

export type PlaygroundResult = {
  output: string;
  usage: { inputTokens: number; outputTokens: number } | null;
};

export function useAiPrompts() {
  return useQuery({
    queryKey: ['ai-prompts'],
    queryFn: async (): Promise<AiPromptListItem[]> => {
      return (
        (await fetchJson<AiPromptListItem[]>('/api/admin/content/ai-prompts')) ?? []
      );
    },
  });
}

export function useAiPrompt(id: string) {
  return useQuery({
    queryKey: ['ai-prompt', id],
    enabled: !!id,
    queryFn: async (): Promise<AiPromptDetail | undefined> => {
      return fetchJson<AiPromptDetail>(`/api/admin/content/ai-prompts/${id}`);
    },
  });
}

async function send(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export function useAiPromptMutations() {
  const qc = useQueryClient();
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['ai-prompts'] });
    qc.invalidateQueries({ queryKey: ['ai-prompt'] });
  };
  return {
    createVersion: useMutation({
      mutationFn: (v: { id: string; systemText: string; variables: string[]; note?: string }) =>
        send(`/api/admin/content/ai-prompts/${v.id}/versions`, {
          systemText: v.systemText,
          variables: v.variables,
          note: v.note,
        }),
      onSuccess: inval,
    }),
    activate: useMutation({
      mutationFn: (v: { id: string; versionId: string }) =>
        send(`/api/admin/content/ai-prompts/${v.id}/activate`, { versionId: v.versionId }),
      onSuccess: inval,
    }),
  };
}

export function usePlayground() {
  return useMutation({
    mutationFn: async (v: {
      systemText: string;
      userMessage: string;
      variables: Record<string, string>;
    }): Promise<PlaygroundResult | undefined> => {
      const res = await fetch('/api/admin/content/ai-prompts/playground', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error');
      }
      return unwrapData<PlaygroundResult>(await res.json());
    },
  });
}
