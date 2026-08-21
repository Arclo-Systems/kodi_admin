'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { throwApiError } from '@/lib/bff';

// Tipos espejo de `StoreAdminService` (backend). El envelope `{ data }` lo desenvuelve
// `fetchJson`; el OpenAPI no lo declara, así que estos se mantienen a mano.

export type FounderOffer = {
  offerId: string;
  slug: string;
  label: string;
  country: string;
  isActive: boolean;
  slotsTotal: number;
  slotsClaimed: number;
  slotsReserved: number;
  slotsAvailable: number;
  activeFounders: number;
  timeline: { date: string; claimed: number; released: number }[];
};

export type ReservationStatus = 'reserved' | 'consumed' | 'released';

export type Reservation = {
  id: string;
  offerId: string;
  offerSlug: string;
  country: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  purchaseIntentId: string | null;
  status: ReservationStatus;
  expiresAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type StoreEvent = {
  id: string;
  messageId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
  latencyMs: number | null;
  purchaseTokenSha: string | null;
  payload: unknown;
};

export type NegativeKokos = {
  id: string;
  email: string;
  displayName: string;
  country: string | null;
  kokosBalance: number;
};

export const INCIDENT_STATUSES = [
  'unmapped',
  'unresolved',
  'pending_module_selection',
  'founder_without_reservation',
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type Incidents = Paged<StoreEvent> & {
  negativeKokos: NegativeKokos[];
  counts: Record<string, number>;
};

export type StoreSku = {
  id: string;
  provider: string;
  productId: string;
  basePlanId: string;
  plan: string;
  period: string;
  packSize: number;
  isFounder: boolean;
  isActive: boolean;
  updatedAt: string;
};

export type KillSwitch = {
  key: string;
  enabled: boolean;
  effective: boolean;
  blockedBy: string[];
  scope: string;
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

const EMPTY: Paged<never> = { items: [], total: 0, page: 1, pageSize: 50 };

const BASE = '/api/admin/monetization';

// Namespace propio: `['monetization']` a secas ya lo usa la analítica de suscripciones.
const KEY = ['monetization', 'store'] as const;

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

export function useFounderOffer(country: string) {
  return useQuery({
    queryKey: [...KEY, 'founder-offer', country],
    // Sin país no hay oferta que pedir: el backend exige el parámetro.
    enabled: country !== '',
    queryFn: () => fetchJson<FounderOffer>(`${BASE}/founder-offer${qs({ country })}`),
  });
}

export type ReservationsQuery = { status?: ReservationStatus; country?: string; page?: number };

export function useReservations(query: ReservationsQuery) {
  return useQuery({
    queryKey: [...KEY, 'reservations', query],
    queryFn: async () =>
      (await fetchJson<Paged<Reservation>>(`${BASE}/reservations${qs({ ...query })}`)) ?? EMPTY,
  });
}

export type EventsQuery = { status?: string; eventType?: string; days?: number; page?: number };

export function useStoreEvents(query: EventsQuery) {
  return useQuery({
    queryKey: [...KEY, 'events', query],
    queryFn: async () =>
      (await fetchJson<Paged<StoreEvent>>(`${BASE}/events${qs({ ...query })}`)) ?? EMPTY,
  });
}

export function useIncidents(query: { status?: IncidentStatus; page?: number }) {
  return useQuery({
    queryKey: [...KEY, 'incidents', query],
    queryFn: async () =>
      (await fetchJson<Incidents>(`${BASE}/incidents${qs({ ...query })}`)) ?? {
        ...EMPTY,
        negativeKokos: [],
        counts: {},
      },
  });
}

export function useDlq(page = 1) {
  return useQuery({
    queryKey: [...KEY, 'dlq', page],
    queryFn: async () => (await fetchJson<Paged<StoreEvent>>(`${BASE}/dlq${qs({ page })}`)) ?? EMPTY,
  });
}

export function useStoreSkus(page = 1) {
  return useQuery({
    queryKey: [...KEY, 'skus', page],
    queryFn: async () =>
      (await fetchJson<Paged<StoreSku>>(`${BASE}/skus${qs({ page, pageSize: 200 })}`)) ?? EMPTY,
  });
}

export function useKillSwitches() {
  return useQuery({
    queryKey: [...KEY, 'flags'],
    queryFn: async () =>
      (await fetchJson<{ flags: KillSwitch[] }>(`${BASE}/flags`))?.flags ?? [],
  });
}

async function post(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, 'No pudimos completar la acción');
  return res.json().catch(() => ({}));
}

/**
 * Las cinco mutaciones del área. Todas mandan `reason` porque el backend lo exige
 * (M11): el motivo es lo que la fila de auditoría guarda para explicar por qué
 * soporte tocó una compra ajena.
 */
export function useStoreMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    releaseReservation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        post(`${BASE}/reservations/${id}/release`, { reason }),
      onSuccess: invalidate,
    }),
    reprocessEvent: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        post(`${BASE}/events/${id}/reprocess`, { reason }),
      onSuccess: invalidate,
    }),
    resolveIncident: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        post(`${BASE}/incidents/${id}/resolve`, { reason }),
      onSuccess: invalidate,
    }),
    assignModules: useMutation({
      mutationFn: (input: {
        id: string;
        userId: string;
        moduleIds: string[];
        reason: string;
      }) =>
        post(`${BASE}/incidents/${input.id}/modules`, {
          userId: input.userId,
          moduleIds: input.moduleIds,
          reason: input.reason,
        }),
      onSuccess: invalidate,
    }),
    retryDlq: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        post(`${BASE}/dlq/${id}/retry`, { reason }),
      onSuccess: invalidate,
    }),
  };
}
