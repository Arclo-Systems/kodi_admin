'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type RaffleStatus =
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'awarded'
  | 'awarded_pending_review'
  | 'awarded_final'
  | 'reverted';

export type DeliveryStatus = 'notified' | 'contacted' | 'delivered' | 'unresponsive';

export const RAFFLE_STATUS_LABELS: Record<RaffleStatus, string> = {
  scheduled: 'Programada',
  open: 'Abierta',
  closed: 'Cerrada',
  awarded: 'Otorgada',
  awarded_pending_review: 'En revisión',
  awarded_final: 'Final',
  reverted: 'Revertida',
};

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  notified: 'Notificado',
  contacted: 'Contactado',
  delivered: 'Entregado',
  unresponsive: 'Sin respuesta',
};

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'notified',
  'contacted',
  'delivered',
  'unresponsive',
];

export type Raffle = {
  id: string;
  country: string;
  moduleId: string;
  moduleShortName: string;
  cycleYear: number;
  cycleMonth: number;
  name: string;
  description: string;
  prizeDescription: string;
  prizeImageUrl: string | null;
  sponsorId: string | null;
  prizesCount: number;
  status: RaffleStatus;
  drawAt: string;
  awardedAt: string | null;
  reversibleUntil: string | null;
  winnersCount?: number;
  entriesCount?: number;
};

export type RaffleWinner = {
  id: string;
  userId: string;
  position: number;
  deliveryStatus: DeliveryStatus;
  contactInfo: string | null;
  prizeNotes: string | null;
  prizeDeliveredAt: string | null;
  isReplacement: boolean;
  user?: { displayName: string };
};

export type RaffleDetail = Raffle & {
  sponsor: { name: string; logoUrl: string | null } | null;
  winners: RaffleWinner[];
};

export type RaffleListQuery = {
  country?: string;
  moduleId?: string;
  status?: RaffleStatus;
  page: number;
  pageSize: number;
};

type RaffleListPage = {
  items: Raffle[];
  total: number;
  page: number;
  pageSize: number;
};

export type CompleteRaffleInput = {
  name?: string;
  description?: string;
  prizeDescription: string;
  prizeImageUrl: string | null;
  sponsorId: string | null;
  prizesCount: number;
};

export type UpdateWinnerInput = {
  deliveryStatus?: DeliveryStatus;
  contactInfo?: string | null;
  prizeNotes?: string | null;
  prizeDeliveredAt?: string | null;
};

async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<unknown> {
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

export function useRaffles(query: RaffleListQuery) {
  return useQuery({
    queryKey: ['raffles', query],
    queryFn: async (): Promise<RaffleListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/economy/raffles?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch raffles failed');
      return (
        unwrapData<RaffleListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useRaffle(id: string) {
  return useQuery({
    queryKey: ['raffle', id],
    enabled: !!id,
    queryFn: async (): Promise<RaffleDetail | undefined> => {
      const res = await fetch(`/api/admin/economy/raffles/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch raffle failed');
      return unwrapData<RaffleDetail>(await res.json());
    },
  });
}

export function useRaffleActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['raffles'] });
    qc.invalidateQueries({ queryKey: ['raffle', id] });
  };
  return {
    complete: useMutation({
      mutationFn: (input: CompleteRaffleInput) =>
        sendJson(`/api/admin/economy/raffles/${id}/complete`, 'POST', input),
      onSuccess: invalidate,
    }),
    revert: useMutation({
      mutationFn: () => sendJson(`/api/admin/economy/raffles/${id}/revert`, 'POST', {}),
      onSuccess: invalidate,
    }),
    updateWinner: useMutation({
      mutationFn: ({ winnerId, input }: { winnerId: string; input: UpdateWinnerInput }) =>
        sendJson(`/api/admin/economy/raffles/winners/${winnerId}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    replaceWinner: useMutation({
      mutationFn: (winnerId: string) =>
        sendJson(`/api/admin/economy/raffles/winners/${winnerId}/replace`, 'POST', {}),
      onSuccess: invalidate,
    }),
  };
}
