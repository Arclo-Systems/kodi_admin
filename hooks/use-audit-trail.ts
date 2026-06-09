'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type AuditTrailEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actor: { id: string; email: string; displayName: string };
  reason: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

type AuditTrailPage = { items: AuditTrailEntry[]; total: number };

export function useAuditTrail(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: ['audit-trail', resourceType, resourceId],
    queryFn: async (): Promise<AuditTrailPage> => {
      const url = new URL('/api/admin/audit-log/by-resource', window.location.origin);
      url.searchParams.set('type', resourceType);
      url.searchParams.set('id', resourceId);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('audit fetch failed');
      // El backend envuelve en { data: { items, total } }.
      return unwrapData<AuditTrailPage>(await res.json()) ?? { items: [], total: 0 };
    },
  });
}
