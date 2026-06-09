'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type CouponTier = 'basico' | 'estandar' | 'premium';

export type CouponCategory =
  | 'academico'
  | 'libreria'
  | 'restaurante'
  | 'tecnologia'
  | 'autoescuela'
  | 'universidad'
  | 'transporte';

export const COUPON_CATEGORIES: CouponCategory[] = [
  'academico',
  'libreria',
  'restaurante',
  'tecnologia',
  'autoescuela',
  'universidad',
  'transporte',
];

export const COUPON_CATEGORY_LABELS: Record<CouponCategory, string> = {
  academico: 'Académico',
  libreria: 'Librerías',
  restaurante: 'Restaurantes',
  tecnologia: 'Tecnología',
  autoescuela: 'Autoescuelas',
  universidad: 'Universidades',
  transporte: 'Transporte',
};

export type CouponBranchAssignment = {
  branchId: string;
  stockRemaining: number | null;
  branch: { label: string };
};

export type CouponListItem = {
  id: string;
  sponsorId: string;
  sponsorName: string;
  title: string;
  description: string;
  tier: CouponTier;
  kolonesCost: number;
  country: string;
  moduleId: string | null;
  isProExclusive: boolean;
  stockTotal: number | null;
  stockRemaining: number | null;
  validUntil: string | null;
  isActive: boolean;
  codePrefix: string | null;
  codeSuffixLen: number;
  limitPerUser: number | null;
  redeemedCount: number;
  updatedAt: string;
};

export type CouponDetail = {
  id: string;
  sponsorId: string;
  title: string;
  description: string;
  tier: CouponTier;
  kolonesCost: number;
  country: string;
  moduleId: string | null;
  isProExclusive: boolean;
  stockTotal: number | null;
  stockRemaining: number | null;
  validUntil: string | null;
  isActive: boolean;
  codePrefix: string | null;
  codeSuffixLen: number;
  limitPerUser: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  category: CouponCategory;
  conditions: string[];
  validDaysAfterRedeem: number;
  updatedAt: string;
  sponsor: { name: string; logoUrl: string | null };
  couponBranches: CouponBranchAssignment[];
};

export type CouponInput = {
  sponsorId: string;
  title: string;
  description: string;
  tier: CouponTier;
  kolonesCost: number;
  country: string;
  moduleId: string | null;
  isProExclusive: boolean;
  stockTotal: number | null;
  validUntil: string | null;
  codePrefix: string | null;
  codeSuffixLen: number;
  limitPerUser: number | null;
  category: CouponCategory;
  conditions: string[];
  validDaysAfterRedeem: number;
};

export type CouponStats = {
  couponId: string;
  redeemed: number;
  used: number;
  redemptionRate: number;
  kolonesSpent: number;
};

export type UserCouponStatus = 'active' | 'used' | 'invalidated';

export type UserCouponRow = {
  id: string;
  code: string;
  userId: string;
  redeemedAt: string;
  usedAt: string | null;
  kolonesSpent: number;
  regeneratedAt: string | null;
  invalidatedAt: string | null;
  invalidateReason: string | null;
  userDisplayName: string;
  userEmail: string;
};

export type CouponListQuery = {
  country?: string;
  tier?: CouponTier;
  sponsorId?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

export type UserCouponQuery = {
  status?: UserCouponStatus;
  page: number;
  pageSize: number;
};

type UserCouponPage = {
  items: UserCouponRow[];
  total: number;
  page: number;
  pageSize: number;
};

type CouponListPage = {
  items: CouponListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function useCoupons(query: CouponListQuery) {
  return useQuery({
    queryKey: ['coupons', query],
    queryFn: async (): Promise<CouponListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/coupons?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch coupons failed');
      return (
        unwrapData<CouponListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: ['coupon', id],
    enabled: !!id,
    queryFn: async (): Promise<CouponDetail | undefined> => {
      const res = await fetch(`/api/admin/economy/coupons/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch coupon failed');
      return unwrapData<CouponDetail>(await res.json());
    },
  });
}

export function useCouponStats(id: string) {
  return useQuery({
    queryKey: ['coupon-stats', id],
    enabled: !!id,
    queryFn: async (): Promise<CouponStats | undefined> => {
      const res = await fetch(`/api/admin/economy/coupons/${id}/stats`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch coupon stats failed');
      return unwrapData<CouponStats>(await res.json());
    },
  });
}

export function useCouponRedemptions(id: string, query: UserCouponQuery) {
  return useQuery({
    queryKey: ['coupon-redemptions', id, query],
    enabled: !!id,
    queryFn: async (): Promise<UserCouponPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/coupons/${id}/user-coupons?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch redemptions failed');
      return (
        unwrapData<UserCouponPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  return res.json().catch(() => ({}));
}

export function useCouponMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (input: CouponInput): Promise<string> => {
        const body = await sendJson('/api/admin/economy/coupons', 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: Partial<CouponInput> & { isActive?: boolean };
      }) => sendJson(`/api/admin/economy/coupons/${id}`, 'PATCH', input),
      onSuccess: (_data, { id }) => {
        qc.invalidateQueries({ queryKey: ['coupons'] });
        qc.invalidateQueries({ queryKey: ['coupon', id] });
      },
    }),
  };
}

export function useSetCouponBranches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      couponId,
      branches,
    }: {
      couponId: string;
      branches: { branchId: string; stockRemaining: number | null }[];
    }) =>
      sendJson(`/api/admin/economy/coupons/${couponId}/branches`, 'PUT', { branches }),
    onSuccess: (_data, { couponId }) =>
      qc.invalidateQueries({ queryKey: ['coupon', couponId] }),
  });
}

export function useUserCouponActions(couponId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['coupon-redemptions', couponId] });
    qc.invalidateQueries({ queryKey: ['coupon-stats', couponId] });
  };
  return {
    regenerate: useMutation({
      mutationFn: async (userCouponId: string): Promise<string> => {
        const body = await sendJson(
          `/api/admin/economy/coupons/user-coupons/${userCouponId}/regenerate`,
          'POST',
          {},
        );
        return unwrapData<{ code: string }>(body)?.code ?? '';
      },
      onSuccess: invalidate,
    }),
    refundInvalidate: useMutation({
      mutationFn: ({ userCouponId, reason }: { userCouponId: string; reason: string }) =>
        sendJson(
          `/api/admin/economy/coupons/user-coupons/${userCouponId}/refund-invalidate`,
          'POST',
          { reason },
        ),
      onSuccess: invalidate,
    }),
  };
}
