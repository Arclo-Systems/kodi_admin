'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type TreeTopic = {
  id: string;
  name: string;
  order: number;
  examWeight: number | null;
  questionCount: number;
};
export type TreeSubject = {
  id: string;
  name: string;
  order: number;
  questionCount: number;
  topics: TreeTopic[];
};
export type TreeModule = {
  id: string;
  country: string;
  shortName: string;
  fullName: string;
  isActive: boolean;
  questionCount: number;
  subjects: TreeSubject[];
};

export function useModulesTree(country?: string) {
  return useQuery({
    queryKey: ['modules-tree', country ?? null],
    queryFn: async (): Promise<TreeModule[]> => {
      const qs = country ? `?country=${country}` : '';
      const res = await fetch(`/api/admin/content/modules/tree${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch tree failed');
      return unwrapData<TreeModule[]>(await res.json()) ?? [];
    },
  });
}
