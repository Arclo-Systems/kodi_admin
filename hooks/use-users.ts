'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type UserListItem = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  friendCode: string;
  country: string;
  activeModuleId: string | null;
  accountStatus: 'pending_parental' | 'active' | 'suspended' | 'deleted';
  streakDays: number;
  isBot: boolean;
  createdAt: string;
  lastActiveAt: string | null;
};

export type UserListQuery = {
  search?: string;
  country?: string[];
  activeModuleId?: string;
  plan?: 'free' | 'basico' | 'plus' | 'pro';
  accountStatus?: string;
  isBot?: boolean;
  page: number;
  pageSize: number;
  sortBy?: 'createdAt' | 'lastActiveAt' | 'streakDays';
  sortDir?: 'asc' | 'desc';
};

type UserListPage = { items: UserListItem[]; total: number; page: number; pageSize: number };

export function useUsers(query: UserListQuery) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async (): Promise<UserListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
        else params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch users failed');
      return (
        unwrapData<UserListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}
