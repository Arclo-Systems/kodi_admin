'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type DemandLevel = 'alta' | 'media' | 'baja' | 'saturada';

export const DEMAND_LABELS: Record<DemandLevel, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  saturada: 'Saturada',
};

export type Career = {
  id: string;
  moduleId: string;
  country: string;
  name: string;
  area: string | null;
  riasecCode: string;
  description: string | null;
  fieldOfWork: string | null;
  durationYears: number | null;
  employmentRate: number | null;
  avgSalaryMonthly: number | null;
  demandLevel: DemandLevel | null;
  marketNote: string | null;
  olapYear: number | null;
  isActive: boolean;
  updatedAt: string;
};

export type CareerInput = {
  moduleId: string;
  country: string;
  name: string;
  area: string | null;
  riasecCode: string;
  description: string | null;
  fieldOfWork: string | null;
  durationYears: number | null;
  employmentRate: number | null;
  avgSalaryMonthly: number | null;
  demandLevel: DemandLevel | null;
  marketNote: string | null;
  olapYear: number | null;
  isActive: boolean;
};

export type CareerListQuery = {
  moduleId?: string;
  country?: string;
  area?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type CareerListPage = { items: Career[]; total: number; page: number; pageSize: number };

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useCareers(query: CareerListQuery) {
  return useQuery({
    queryKey: ['careers', query],
    queryFn: async (): Promise<CareerListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/content/careers?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch careers failed');
      return (
        unwrapData<CareerListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useCareer(id: string) {
  return useQuery({
    queryKey: ['career', id],
    enabled: !!id,
    queryFn: async (): Promise<Career | undefined> => {
      const res = await fetch(`/api/admin/content/careers/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch career failed');
      return unwrapData<Career>(await res.json());
    },
  });
}

export function useCareerMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: CareerInput): Promise<string> => {
        const body = await sendJson('/api/admin/content/careers', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['careers'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<CareerInput> }) =>
        sendJson(`/api/admin/content/careers/${id}`, 'PATCH', input),
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries({ queryKey: ['careers'] });
        qc.invalidateQueries({ queryKey: ['career', id] });
      },
    }),
  };
}
