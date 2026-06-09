'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'open' | 'in_review' | 'dismissed' | 'actioned' | 'escalated';

export type ReportUserRef = {
  id: string;
  displayName: string;
  email?: string;
  country?: string;
  accountStatus?: string;
} | null;

export type Report = {
  id: string;
  source: 'user_report' | 'detector';
  target: 'user_profile' | 'duel_behavior';
  reason: string;
  status: ReportStatus;
  severity: ReportSeverity;
  detail: string | null;
  evidence: unknown;
  duelId: string | null;
  resolutionAction: string | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reportedUser: ReportUserRef;
  reporter: ReportUserRef;
};

type ReportsPage = { items: Report[]; total: number; page: number; pageSize: number };

export type ReportsQuery = {
  status?: string;
  severity?: string;
  target?: string;
  reason?: string;
  source?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type ResolveInput = {
  status: 'in_review' | 'dismissed' | 'actioned' | 'escalated';
  resolutionAction?: string;
  resolutionNote?: string;
};

export type ModerationStats = { open: number; bySeverity: Record<string, number> };

export const MODERATION_PAGE_SIZE = 20;

async function send(url: string, method: 'PATCH' | 'POST', body?: unknown): Promise<unknown> {
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

export function useReports(query: ReportsQuery) {
  return useQuery({
    queryKey: ['moderation', 'reports', query],
    queryFn: async (): Promise<ReportsPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/moderation/reports?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch reports failed');
      return (
        unwrapData<ReportsPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ['moderation', 'report', id],
    enabled: !!id,
    queryFn: async (): Promise<Report | undefined> => {
      const res = await fetch(`/api/admin/moderation/reports/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch report failed');
      return unwrapData<Report>(await res.json());
    },
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: async (): Promise<ModerationStats> => {
      const res = await fetch('/api/admin/moderation/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch moderation stats failed');
      return unwrapData<ModerationStats>(await res.json()) ?? { open: 0, bySeverity: {} };
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveInput }) =>
      send(`/api/admin/moderation/reports/${id}`, 'PATCH', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
  });
}
