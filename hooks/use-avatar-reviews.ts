'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwApiError } from '@/lib/bff';
import { fetchJson } from '@/lib/fetch-json';

export const AVATAR_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'superseded',
] as const;
export type AvatarReviewStatus = (typeof AVATAR_REVIEW_STATUSES)[number];

// La cola de fotos responde en snake_case (el resto del panel usa camelCase). Se refleja
// tal cual el contrato del backend en vez de mapearlo: una capa de renombres acá sería
// una fuente silenciosa de desincronización.
export type AvatarReview = {
  id: string;
  photo_url: string;
  status: AvatarReviewStatus;
  reported_at: string | null;
  report_count: number;
  waiting_since: string;
  reviewed_at: string | null;
  review_note: string | null;
  user: {
    id: string;
    display_name: string;
    username: string | null;
    country: string;
    account_status: string;
  };
};

type AvatarReviewsPage = {
  items: AvatarReview[];
  total: number;
  page: number;
  pageSize: number;
};

export type AvatarReviewDecision = 'approve' | 'reject';

export type DecideAvatarReviewInput = {
  id: string;
  decision: AvatarReviewDecision;
  note?: string;
};

// Cola visual: cada fila lleva una foto grande, así que la página es más corta que las
// tablas de texto del panel.
export const AVATAR_REVIEW_PAGE_SIZE = 12;
export const AVATAR_REVIEW_NOTE_MAX_LENGTH = 500;

const AVATAR_REVIEWS_KEY = ['moderation', 'avatar-reviews'] as const;

export function useAvatarReviews(query: { status: AvatarReviewStatus; page: number }) {
  return useQuery({
    queryKey: [...AVATAR_REVIEWS_KEY, query],
    queryFn: async (): Promise<AvatarReviewsPage> => {
      const params = new URLSearchParams({
        status: query.status,
        page: String(query.page),
        pageSize: String(AVATAR_REVIEW_PAGE_SIZE),
      });
      return (
        (await fetchJson<AvatarReviewsPage>(
          `/api/admin/moderation/avatar-reviews?${params}`,
        )) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: AVATAR_REVIEW_PAGE_SIZE,
        }
      );
    },
  });
}

export function useDecideAvatarReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, note }: DecideAvatarReviewInput): Promise<void> => {
      const res = await fetch(`/api/admin/moderation/avatar-reviews/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      if (!res.ok) await throwApiError(res, 'No se pudo registrar la decisión');
    },
    // `onSettled` y no `onSuccess`: cuando otro moderador se adelantó, la decisión falla
    // con 404 y la cola en pantalla es justamente la que quedó vieja — hay que refrescarla
    // igual. Se invalida toda la moderación porque la foto también alimenta los reportes.
    onSettled: () => qc.invalidateQueries({ queryKey: ['moderation'] }),
  });
}
