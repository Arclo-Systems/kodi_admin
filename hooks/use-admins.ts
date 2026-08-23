'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { AdminRole } from '@/lib/auth';

export type AdminListItem = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isGlobalScope: boolean;
  assignedCountries: string[];
  adminActiveStatus: 'active' | 'inactive' | 'pending_first_login' | null;
  invitedAt: string | null;
  lastActiveAt: string | null;
};

export type AdminListQuery = {
  role?: string;
  scope?: 'global' | 'regional';
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
};

type AdminListPage = { items: AdminListItem[]; total: number };

export function useAdmins(query: AdminListQuery) {
  return useQuery({
    queryKey: ['admins', query],
    queryFn: async (): Promise<AdminListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') params.set(k, String(v));
      }
      return (
        (await fetchJson<AdminListPage>(`/api/admin/admins?${params}`)) ?? {
          items: [],
          total: 0,
        }
      );
    },
  });
}
