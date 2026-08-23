'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwApiError, unwrapData } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';
import type { UniversityType } from '@/lib/sponsorship';

// examWeight/presentationWeight son Decimal de Prisma → el backend los serializa como string ("0.5").
// Todo el bloque de admisión (pesos + escala) es null en las privadas (§10.1): no examinan.
export type University = {
  id: string;
  country: string;
  code: string;
  name: string;
  type: UniversityType;
  websiteUrl: string | null;
  /** D12: mientras la ventana esté vigente la app rotula "Patrocinado" y el panel no puede apagarlo. */
  isSponsored: boolean;
  sponsoredFrom: string | null;
  sponsoredUntil: string | null;
  examWeight: string | null;
  presentationWeight: string | null;
  scaleMin: number | null;
  scaleMax: number | null;
  /** Examen (materia de admisión) que la universidad usa; null = sin asignar. */
  examSubjectId: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type UniversityInput = {
  country: string;
  code: string;
  name: string;
  type: UniversityType;
  websiteUrl: string | null;
  isSponsored: boolean;
  sponsoredFrom: string | null;
  sponsoredUntil: string | null;
  /** Los cuatro van juntos y SOLO en las públicas: el backend rechaza una pública sin ellos. */
  examWeight?: number;
  presentationWeight?: number;
  scaleMin?: number;
  scaleMax?: number;
  examSubjectId: string | null;
  isActive: boolean;
};

export type UniversityListQuery = {
  country?: string;
  type?: UniversityType;
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
  if (!res.ok) await throwApiError(res, 'No se pudo guardar la universidad');
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
      return (
        (await fetchJson<UniversityListPage>(
          `/api/admin/content/universities?${params}`,
        )) ?? {
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
      return fetchJson<University>(`/api/admin/content/universities/${id}`);
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
