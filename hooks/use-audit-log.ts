'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actor: { email: string; displayName: string } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  createdAt: string;
};

export type AuditLogQuery = {
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

type AuditLogPage = { items: AuditLogEntry[]; total: number };

export function useAuditLog(query: AuditLogQuery) {
  return useQuery({
    queryKey: ['audit-log', query],
    queryFn: async (): Promise<AuditLogPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/audit-log?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch audit-log failed');
      return unwrapData<AuditLogPage>(await res.json()) ?? { items: [], total: 0 };
    },
  });
}
