'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type ScholarshipMatchedUser = {
  id: string;
  displayName: string;
  friendCode: string;
  country: string;
};

export type Scholarship = {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  country: string;
  examSlug: string;
  message: string;
  status: string;
  adminNotes: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  matchedUser: ScholarshipMatchedUser | null;
};

type ScholarshipsPage = { items: Scholarship[]; total: number; page: number; pageSize: number };

export type ScholarshipsQuery = {
  status?: string;
  country?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type ApproveScholarshipInput = {
  id: string;
  moduleId: string;
  plan: string;
  period: string;
  expiresAt: string;
  adminNotes?: string;
};

async function send(url: string, body?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
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

export function useScholarships(query: ScholarshipsQuery) {
  return useQuery({
    queryKey: ['scholarships', query],
    queryFn: async (): Promise<ScholarshipsPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/monetization/scholarships?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch scholarships failed');
      return (
        unwrapData<ScholarshipsPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useScholarshipMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['scholarships'] });
    // Aprobar crea/extiende una suscripción comp — refrescar también esa vista.
    void qc.invalidateQueries({ queryKey: ['subscriptions'] });
  };
  return {
    approve: useMutation({
      mutationFn: ({ id, ...body }: ApproveScholarshipInput) =>
        send(`/api/admin/monetization/scholarships/${id}/approve`, body),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
        send(`/api/admin/monetization/scholarships/${id}/reject`, { adminNotes }),
      onSuccess: invalidate,
    }),
  };
}
