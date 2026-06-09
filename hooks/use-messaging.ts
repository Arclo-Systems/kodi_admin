'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import type { MessageChannel } from '@/hooks/use-message-templates';

export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';
export type CampaignKind = 'direct' | 'broadcast';

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pend. aprobación',
  approved: 'Aprobada',
  sending: 'Enviando',
  sent: 'Enviada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
};
export const STATUS_VARIANT: Record<CampaignStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  pending_approval: 'secondary',
  approved: 'secondary',
  sending: 'secondary',
  sent: 'default',
  failed: 'destructive',
  cancelled: 'outline',
};

export type Campaign = {
  id: string;
  kind: CampaignKind;
  channel: MessageChannel;
  status: CampaignStatus;
  subject: string | null;
  body: string;
  headline: string | null;
  assetUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  secondaryText: string | null;
  targetUserId: string | null;
  segmentId: string | null;
  estimatedCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  segment?: { name: string } | null;
  targetUser?: { displayName: string; email: string } | null;
};

type CampaignsPage = { items: Campaign[]; total: number; page: number; pageSize: number };

export type CampaignsQuery = { status?: string; page: number; pageSize: number };

// Campos del email estructurado (layout Duolingo). Opcionales: se pueden guardar borradores
// incompletos; la obligatoriedad de asset+CTA se valida al enviar en el backend (AUD-API-1).
export type StructuredEmailInput = {
  headline?: string;
  assetUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryText?: string;
};

export type CreateCampaignInput = {
  kind: CampaignKind;
  channel: MessageChannel;
  subject?: string;
  body: string;
  targetUserId?: string;
  segmentId?: string;
} & StructuredEmailInput;

// PATCH (solo-draft): no incluye kind/targetUserId (inmutables en el backend).
export type UpdateCampaignInput = {
  channel?: MessageChannel;
  subject?: string;
  body?: string;
  segmentId?: string;
} & StructuredEmailInput;

export const CAMPAIGNS_PAGE_SIZE = 20;

async function send(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<unknown> {
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

export function useCampaigns(query: CampaignsQuery) {
  return useQuery({
    queryKey: ['messaging', 'campaigns', query],
    queryFn: async (): Promise<CampaignsPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/messaging/campaigns?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch campaigns failed');
      return (
        unwrapData<CampaignsPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['messaging', 'campaigns', 'detail', id],
    retry: false,
    queryFn: async (): Promise<Campaign> => {
      const res = await fetch(`/api/admin/messaging/campaigns/${id}`, { credentials: 'include' });
      if (res.status === 404) throw new Error('NOT_FOUND');
      if (!res.ok) throw new Error('fetch campaign failed');
      const data = unwrapData<Campaign>(await res.json());
      if (!data) throw new Error('NOT_FOUND');
      return data;
    },
  });
}

export function useCampaignMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['messaging', 'campaigns'] });
  return {
    create: useMutation({
      mutationFn: (input: CreateCampaignInput) => send('/api/admin/messaging/campaigns', 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateCampaignInput }) =>
        send(`/api/admin/messaging/campaigns/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: (id: string) => send(`/api/admin/messaging/campaigns/${id}/approve`, 'POST'),
      onSuccess: invalidate,
    }),
    sendNow: useMutation({
      mutationFn: (id: string) => send(`/api/admin/messaging/campaigns/${id}/send`, 'POST'),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => send(`/api/admin/messaging/campaigns/${id}/cancel`, 'POST'),
      onSuccess: invalidate,
    }),
  };
}
