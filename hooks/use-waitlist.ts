'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export type WaitlistStatus = 'pending' | 'notified';

export type WaitlistSignup = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
  notifiedAt: string | null;
};

export type WaitlistQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: WaitlistStatus;
};

export type WaitlistPage = {
  items: WaitlistSignup[];
  total: number;
  page: number;
  pageSize: number;
};

export type WaitlistStats = {
  total: number;
  pending: number;
  notified: number;
  firstSignupAt: string | null;
  lastSignupAt: string | null;
};

export type WaitlistNotifyResult = {
  queued: boolean;
  pending: number;
};

const KEY = ['launches', 'waitlist'] as const;

// `search` vacío se omite en vez de mandarse como '': el backend valida min(1) y
// un string vacío haría fallar toda la consulta con un 400 mientras el admin borra
// lo que escribió.
export function waitlistQueryString(query: WaitlistQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.status) params.set('status', query.status);
  return params.toString();
}

export function useWaitlist(query: WaitlistQuery) {
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: async (): Promise<WaitlistPage | undefined> =>
      fetchJson<WaitlistPage>(`/api/admin/launches/waitlist?${waitlistQueryString(query)}`),
  });
}

export function useWaitlistStats() {
  return useQuery({
    queryKey: [...KEY, 'stats'],
    queryFn: async (): Promise<WaitlistStats | undefined> =>
      fetchJson<WaitlistStats>('/api/admin/launches/waitlist/stats'),
  });
}

export function useWaitlistNotify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WaitlistNotifyResult> => {
      const res = await fetch('/api/admin/launches/waitlist/notify', {
        method: 'POST',
        credentials: 'include',
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        data?: WaitlistNotifyResult;
      };
      if (!res.ok) throw new Error(body.message ?? 'No se pudo encolar el envío');
      return body.data ?? { queued: false, pending: 0 };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
