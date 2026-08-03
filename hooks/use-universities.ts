'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// examWeight/presentationWeight son Decimal de Prisma → el backend los serializa como string ("0.5").
export type University = {
  id: string;
  country: string;
  code: string;
  name: string;
  examWeight: string;
  presentationWeight: string;
  scaleMin: number;
  scaleMax: number;
  /** Examen (materia de admisión) que la universidad usa; null = sin asignar. */
  examSubjectId: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type UniversityInput = {
  country: string;
  code: string;
  name: string;
  examWeight: number;
  presentationWeight: number;
  scaleMin: number;
  scaleMax: number;
  examSubjectId: string | null;
  isActive: boolean;
};

export type UniversityListQuery = {
  country?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type UniversityListPage = { items: University[]; total: number; page: number; pageSize: number };

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

export function useUniversities(query: UniversityListQuery) {
  return useQuery({
    queryKey: ['universities', query],
    queryFn: async (): Promise<UniversityListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/content/universities?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch universities failed');
      return (
        unwrapData<UniversityListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useUniversity(id: string) {
  return useQuery({
    queryKey: ['university', id],
    enabled: !!id,
    queryFn: async (): Promise<University | undefined> => {
      const res = await fetch(`/api/admin/content/universities/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch university failed');
      return unwrapData<University>(await res.json());
    },
  });
}

export function useUniversityMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: UniversityInput): Promise<string> => {
        const body = await sendJson('/api/admin/content/universities', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['universities'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<UniversityInput> }) =>
        sendJson(`/api/admin/content/universities/${id}`, 'PATCH', input),
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries({ queryKey: ['universities'] });
        qc.invalidateQueries({ queryKey: ['university', id] });
      },
    }),
  };
}
