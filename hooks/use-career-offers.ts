'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwApiError, unwrapData } from '@/lib/bff';
import type { UniversityType } from '@/lib/sponsorship';

export const OFFER_MODALITIES = ['presencial', 'virtual', 'mixta'] as const;
export type OfferModality = (typeof OFFER_MODALITIES)[number];

export const OFFER_MODALITY_LABEL: Record<OfferModality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  mixta: 'Mixta',
};

export type CareerOfferUniversity = {
  id: string;
  code: string;
  name: string;
  type: UniversityType;
  isSponsored: boolean;
  sponsoredFrom: string | null;
  sponsoredUntil: string | null;
};

export type CareerOffer = {
  id: string;
  careerProfileId: string;
  campuses: string[];
  modality: OfferModality | null;
  durationText: string | null;
  scheduleText: string | null;
  costText: string | null;
  note: string | null;
  url: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  university: CareerOfferUniversity;
};

export type CreateCareerOfferInput = {
  universityId: string;
  campuses: string[];
  modality: OfferModality | null;
  durationText: string | null;
  scheduleText: string | null;
  costText: string | null;
  note: string | null;
  url: string;
  isActive: boolean;
};

/** universityId es inmutable: es la mitad de la clave única (carrera, U). */
export type UpdateCareerOfferInput = Omit<CreateCareerOfferInput, 'universityId'>;

export type CareerOfferUploadResult = {
  created: number;
  updated: number;
  invalidRows: { careerName: string; universityCode: string; reason: string }[];
};

export type CareerOffersReportRow = {
  universityId: string;
  universityCode: string;
  universityName: string;
  sheetOpens: number;
  linkClicks: number;
};

export type CareerOffersReport = { items: CareerOffersReportRow[]; from: string; to: string };

const offersKey = (careerId: string) => ['career-offers', careerId] as const;
const base = (careerId: string) => `/api/admin/content/careers/${careerId}/offers`;

async function send(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) await throwApiError(res, fallback);
  return res.json().catch(() => ({}));
}

export function useCareerOffers(careerId: string) {
  return useQuery({
    queryKey: offersKey(careerId),
    enabled: !!careerId,
    queryFn: async (): Promise<CareerOffer[]> => {
      const res = await fetch(base(careerId), { credentials: 'include' });
      if (!res.ok) await throwApiError(res, 'No se pudieron cargar las ofertas');
      return unwrapData<{ items: CareerOffer[] }>(await res.json())?.items ?? [];
    },
  });
}

export function useCareerOfferMutations(careerId: string) {
  const qc = useQueryClient();
  const inval = () => qc.invalidateQueries({ queryKey: offersKey(careerId) });

  return {
    create: useMutation({
      mutationFn: (input: CreateCareerOfferInput) =>
        send(base(careerId), 'POST', input, 'No se pudo crear la oferta'),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<UpdateCareerOfferInput> }) =>
        send(`${base(careerId)}/${id}`, 'PATCH', input, 'No se pudo actualizar la oferta'),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        send(`${base(careerId)}/${id}`, 'DELETE', undefined, 'No se pudo eliminar la oferta'),
      onSuccess: inval,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) =>
        send(`${base(careerId)}/reorder`, 'PUT', { ids }, 'No se pudo reordenar'),
      // Optimista: sin esto la fila salta de vuelta a su lugar hasta que responde
      // el refetch, y con dos clics seguidos se ve el orden viejo.
      onMutate: async (ids) => {
        await qc.cancelQueries({ queryKey: offersKey(careerId) });
        const previous = qc.getQueryData<CareerOffer[]>(offersKey(careerId));
        if (previous) {
          const byId = new Map(previous.map((o) => [o.id, o]));
          qc.setQueryData<CareerOffer[]>(
            offersKey(careerId),
            ids.flatMap((id) => byId.get(id) ?? []),
          );
        }
        return { previous };
      },
      onError: (_e, _ids, ctx) => {
        if (ctx?.previous) qc.setQueryData(offersKey(careerId), ctx.previous);
      },
      onSettled: inval,
    }),
  };
}

export function useCareerOffersUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { country: string; csv: string }): Promise<CareerOfferUploadResult> => {
      const body = await send(
        '/api/admin/content/careers/offers/upload-csv',
        'POST',
        v,
        'No se pudo importar el CSV',
      );
      return (
        unwrapData<CareerOfferUploadResult>(body) ?? { created: 0, updated: 0, invalidRows: [] }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['career-offers'] }),
  });
}

export type CareerOffersReportQuery = { from: string; to: string; country?: string };

export function useCareerOffersReport(query: CareerOffersReportQuery) {
  return useQuery({
    queryKey: ['career-offers-report', query],
    enabled: !!query.from && !!query.to,
    queryFn: async (): Promise<CareerOffersReport> => {
      const params = new URLSearchParams({ from: query.from, to: query.to });
      if (query.country) params.set('country', query.country);
      const res = await fetch(`/api/admin/content/career-offers/report?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) await throwApiError(res, 'No se pudo cargar el reporte');
      return (
        unwrapData<CareerOffersReport>(await res.json()) ?? {
          items: [],
          from: query.from,
          to: query.to,
        }
      );
    },
  });
}
