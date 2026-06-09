'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export const RIASEC_DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
export type RiasecDimension = (typeof RIASEC_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<RiasecDimension, string> = {
  R: 'Realista',
  I: 'Investigador',
  A: 'Artístico',
  S: 'Social',
  E: 'Emprendedor',
  C: 'Convencional',
};

export type RiasecType = {
  id: string;
  dimension: RiasecDimension;
  title: string;
  summary: string;
  description: string;
  strengths: string[];
  isActive: boolean;
  updatedAt: string;
};

export type RiasecTypeInput = {
  title: string;
  summary: string;
  description: string;
  strengths: string[];
  isActive: boolean;
};

export function useRiasecTypes() {
  return useQuery({
    queryKey: ['riasec-types'],
    queryFn: async (): Promise<RiasecType[]> => {
      const res = await fetch('/api/admin/content/riasec-types', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch riasec types failed');
      return unwrapData<RiasecType[]>(await res.json()) ?? [];
    },
  });
}

export function useRiasecTypeMutations() {
  const qc = useQueryClient();
  return {
    update: useMutation({
      mutationFn: async ({
        dimension,
        input,
      }: {
        dimension: RiasecDimension;
        input: Partial<RiasecTypeInput>;
      }) => {
        const res = await fetch(`/api/admin/content/riasec-types/${dimension}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(b.message ?? 'Error');
        }
        return res.json().catch(() => ({}));
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['riasec-types'] }),
    }),
  };
}
