'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';
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
      return (
        (await fetchJson<CampaignsPage>(
          `/api/admin/messaging/campaigns?${params}`,
        )) ?? {
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
      // El 404 tiene copy propio en la pantalla; cualquier otro error (incluido el 401
      // de sesión caída) se re-lanza tal cual para que lo tome el manejo global.
      const data = await fetchJson<Campaign>(
        `/api/admin/messaging/campaigns/${id}`,
      ).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          throw new Error('NOT_FOUND');
        }
        throw err;
      });
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
