'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type MessageChannel = 'email' | 'push';

export type MessageTemplate = {
  id: string;
  key: string;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: string;
};

export type TemplateInput = {
  key?: string;
  channel?: MessageChannel;
  subject?: string;
  body?: string;
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

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['messaging', 'templates'],
    queryFn: async (): Promise<MessageTemplate[]> => {
      const res = await fetch('/api/admin/messaging/templates', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch templates failed');
      return unwrapData<MessageTemplate[]>(await res.json()) ?? [];
    },
  });
}

export function useTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['messaging', 'templates'] });
  return {
    create: useMutation({
      mutationFn: (input: TemplateInput) => send('/api/admin/messaging/templates', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: TemplateInput }) =>
        send(`/api/admin/messaging/templates/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/messaging/templates/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}
