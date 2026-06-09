'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type NormalizedReward =
  | { type: 'kokos'; amount: number }
  | { type: 'kolones'; amount: number }
  | { type: 'item'; itemId: string }
  | null;

export type ReferralMilestone = {
  id: string;
  threshold: number;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
  reward: NormalizedReward;
  grantsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MilestoneRewardInput =
  | { kokos: number }
  | { kolones: number }
  | { itemId: string };

export type MilestoneInput = {
  threshold: number;
  label: string | null;
  isActive: boolean;
  reward: MilestoneRewardInput;
};

export type ReferralStats = {
  referrersCount: number;
  qualifiedReferrals: number;
  top: {
    referrerId: string | null;
    displayName: string | null;
    qualifiedCount: number;
  }[];
};

export function useReferralMilestones() {
  return useQuery({
    queryKey: ['referral-milestones'],
    queryFn: async (): Promise<ReferralMilestone[]> => {
      const res = await fetch('/api/admin/economy/referrals/milestones', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch milestones failed');
      return unwrapData<ReferralMilestone[]>(await res.json()) ?? [];
    },
  });
}

export function useReferralStats() {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: async (): Promise<ReferralStats | undefined> => {
      const res = await fetch('/api/admin/economy/referrals/stats', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch referral stats failed');
      return unwrapData<ReferralStats>(await res.json());
    },
  });
}

async function sendJson(
  url: string,
  method: 'POST' | 'PATCH',
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

async function sendDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export function useReferralMilestoneMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['referral-milestones'] });
    qc.invalidateQueries({ queryKey: ['referral-stats'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: MilestoneInput) =>
        sendJson('/api/admin/economy/referrals/milestones', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<MilestoneInput> }) =>
        sendJson(`/api/admin/economy/referrals/milestones/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        sendDelete(`/api/admin/economy/referrals/milestones/${id}`),
      onSuccess: invalidate,
    }),
  };
}
