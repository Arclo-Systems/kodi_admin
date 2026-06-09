'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type AppPlatform = 'ios' | 'android';

export type AppVersion = {
  id: string;
  platform: AppPlatform;
  version: string;
  releaseDate: string;
  releaseNotes: string | null;
  storeUrl: string | null;
  createdAt: string;
};

export type AppVersionInput = {
  platform?: AppPlatform;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  storeUrl?: string;
};

export type CountryLaunchStatus = 'planned' | 'in_preparation' | 'live' | 'paused';

export type CountryRollout = {
  country: string;
  status: CountryLaunchStatus;
  targetDate: string | null;
  launchedAt: string | null;
  notes: string | null;
  userGoal: number | null;
  // null = país fuera del scope del admin (conteo no calculado).
  registeredUsers: number | null;
  activeUsers: number | null;
  updatedAt: string | null;
};

export type CountryRolloutInput = {
  status?: CountryLaunchStatus;
  targetDate?: string | null;
  launchedAt?: string | null;
  notes?: string | null;
  userGoal?: number | null;
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

export function useAppVersions(platform?: AppPlatform) {
  return useQuery({
    queryKey: ['launches', 'versions', platform ?? 'all'],
    queryFn: async (): Promise<AppVersion[]> => {
      const qs = platform ? `?platform=${platform}` : '';
      const res = await fetch(`/api/admin/launches/versions${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch versions failed');
      return unwrapData<AppVersion[]>(await res.json()) ?? [];
    },
  });
}

export function useVersionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['launches', 'versions'] });
  return {
    create: useMutation({
      mutationFn: (input: AppVersionInput) => send('/api/admin/launches/versions', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: AppVersionInput }) =>
        send(`/api/admin/launches/versions/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`/api/admin/launches/versions/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

export function useCountryRollouts() {
  return useQuery({
    queryKey: ['launches', 'countries'],
    queryFn: async (): Promise<CountryRollout[]> => {
      const res = await fetch('/api/admin/launches/countries', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch countries failed');
      return unwrapData<CountryRollout[]>(await res.json()) ?? [];
    },
  });
}

export function useCountryRolloutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ country, input }: { country: string; input: CountryRolloutInput }) =>
      send(`/api/admin/launches/countries/${country}`, 'PATCH', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['launches', 'countries'] }),
  });
}
