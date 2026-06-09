'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type BannerPlacement =
  | 'practice_home'
  | 'jugar_home'
  | 'rankings_home'
  | 'benefits_home'
  | 'session_complete';

export const BANNER_PLACEMENTS: BannerPlacement[] = [
  'practice_home',
  'jugar_home',
  'rankings_home',
  'benefits_home',
  'session_complete',
];

export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  practice_home: 'Home de Práctica',
  jugar_home: 'Home de Jugar',
  rankings_home: 'Home de Rankings',
  benefits_home: 'Home de Beneficios',
  session_complete: 'Fin de sesión',
};

export type Banner = {
  id: string;
  sponsorId: string;
  imageUrl: string;
  clickUrl: string | null;
  country: string;
  moduleId: string | null;
  placement: BannerPlacement;
  weight: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
  sponsorName?: string;
  sponsor?: { name: string; logoUrl: string | null };
};

export type BannerInput = {
  sponsorId: string;
  imageUrl: string;
  clickUrl: string | null;
  country: string;
  moduleId: string | null;
  placement: BannerPlacement;
  weight: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type BannerListQuery = {
  country?: string;
  placement?: BannerPlacement;
  sponsorId?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type BannerListPage = {
  items: Banner[];
  total: number;
  page: number;
  pageSize: number;
};

export type BannerStats = {
  bannerId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  daily: { date: string; impressions: number; clicks: number }[];
};

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

export function useBanners(query: BannerListQuery) {
  return useQuery({
    queryKey: ['banners', query],
    queryFn: async (): Promise<BannerListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/banners?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch banners failed');
      return (
        unwrapData<BannerListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useBanner(id: string) {
  return useQuery({
    queryKey: ['banner', id],
    enabled: !!id,
    queryFn: async (): Promise<Banner | undefined> => {
      const res = await fetch(`/api/admin/economy/banners/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch banner failed');
      return unwrapData<Banner>(await res.json());
    },
  });
}

export function useBannerStats(id: string) {
  return useQuery({
    queryKey: ['banner-stats', id],
    enabled: !!id,
    queryFn: async (): Promise<BannerStats | undefined> => {
      const res = await fetch(`/api/admin/economy/banners/${id}/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch banner stats failed');
      return unwrapData<BannerStats>(await res.json());
    },
  });
}

export function useBannerMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: BannerInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/banners', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<BannerInput> }) =>
        sendJson(`/api/admin/economy/banners/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['banners'] });
        qc.invalidateQueries({ queryKey: ['banner', id] });
      },
    }),
  };
}
