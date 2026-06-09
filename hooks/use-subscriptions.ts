'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type Subscription = {
  id: string;
  userId: string;
  user: { email: string; displayName: string; country: string };
  moduleId: string;
  plan: string;
  period: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  graceEndsAt: string | null;
  isComp: boolean;
};

type SubsPage = { items: Subscription[]; total: number; page: number; pageSize: number };

export type SubsQuery = {
  friendCode?: string;
  plan?: string;
  status?: string;
  page: number;
  pageSize: number;
};

export type GrantInput = {
  friendCode: string;
  moduleId: string;
  plan: string;
  period: string;
  expiresAt: string;
};

async function send(url: string, method: 'POST', body?: unknown): Promise<unknown> {
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

export function useSubscriptions(query: SubsQuery) {
  return useQuery({
    queryKey: ['subscriptions', query],
    queryFn: async (): Promise<SubsPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/monetization/subscriptions?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch subscriptions failed');
      return (
        unwrapData<SubsPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useSubscriptionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscriptions'] });
  return {
    grant: useMutation({
      mutationFn: (input: GrantInput) =>
        send('/api/admin/monetization/subscriptions/grant', 'POST', input),
      onSuccess: invalidate,
    }),
    extend: useMutation({
      mutationFn: ({ id, expiresAt }: { id: string; expiresAt: string }) =>
        send(`/api/admin/monetization/subscriptions/${id}/extend`, 'POST', { expiresAt }),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => send(`/api/admin/monetization/subscriptions/${id}/cancel`, 'POST'),
      onSuccess: invalidate,
    }),
    changeStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        send(`/api/admin/monetization/subscriptions/${id}/status`, 'POST', { status }),
      onSuccess: invalidate,
    }),
  };
}
