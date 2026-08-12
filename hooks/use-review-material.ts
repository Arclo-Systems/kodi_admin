'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

const BASE = '/api/admin/content/review-material';

/** Tarjetas y resumen: `empty` = el tema todavía no tiene esa pieza. */
export type PieceState = 'empty' | 'draft' | 'published';
/** El podcast tiene dos artefactos (guión y audio) y por eso estados propios. */
export type PodcastState = 'empty' | 'draft' | 'script_approved' | 'audio_ready' | 'published';
export type ReviewPiece = 'flashcards' | 'summary' | 'podcast';

export type OverviewTopic = {
  id: string;
  name: string;
  order: number;
  flashcards: PieceState;
  cardCount: number;
  summary: PieceState;
  podcast: PodcastState;
};
export type OverviewSubject = {
  id: string;
  name: string;
  order: number;
  topics: OverviewTopic[];
};
export type OverviewModule = {
  id: string;
  country: string;
  shortName: string;
  fullName: string;
  subjects: OverviewSubject[];
};

export type Flashcard = { id: string; front: string; back: string; order: number };
/** Sin `id` = tarjeta nueva; con `id` conserva el progreso Leitner de los usuarios. */
export type FlashcardInput = { id?: string; front: string; back: string };
export type FlashcardDeck = {
  id: string | null;
  status: PieceState;
  updatedAt: string | null;
  cards: Flashcard[];
};

export type TopicSummary = {
  id: string | null;
  content: string;
  status: PieceState;
  updatedAt: string | null;
};

export type ScriptSegment = { characterKey: string; text: string };
export type PodcastEpisode = {
  id: string | null;
  title: string | null;
  script: ScriptSegment[];
  status: PodcastState;
  audioUrl: string | null;
  durationSeconds: number | null;
  updatedAt: string | null;
};

export type CharacterVoice = {
  id: string;
  key: string;
  displayName: string;
  provider: string | null;
  voiceId: string | null;
  isActive: boolean;
  updatedAt: string;
};
export type CharacterVoiceInput = {
  key: string;
  displayName: string;
  provider: string | null;
  voiceId: string | null;
  isActive: boolean;
};

export type ReviewSessionConfig = {
  id: string;
  country: string | null;
  dailyCardCap: number;
  updatedAt: string;
};

/** Tope por defecto del backend cuando no hay fila para ese país. */
export const DEFAULT_DAILY_CARD_CAP = 20;

async function readJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'No se pudo cargar el material de repaso');
  }
  return unwrapData<T>(await res.json()) ?? null;
}

async function sendJson<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T | null> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? 'La operación no se pudo completar');
  }
  return unwrapData<T>(await res.json().catch(() => ({}))) ?? null;
}

export function useReviewMaterialOverview(country: string | null) {
  return useQuery({
    queryKey: ['review-material', 'overview', country],
    queryFn: async (): Promise<OverviewModule[]> =>
      (await readJson<OverviewModule[]>(`${BASE}/overview${country ? `?country=${country}` : ''}`)) ??
      [],
  });
}

export function useFlashcardDeck(topicId: string) {
  return useQuery({
    queryKey: ['review-material', 'flashcards', topicId],
    queryFn: () => readJson<FlashcardDeck>(`${BASE}/topics/${topicId}/flashcards`),
  });
}

export function useTopicSummary(topicId: string) {
  return useQuery({
    queryKey: ['review-material', 'summary', topicId],
    queryFn: () => readJson<TopicSummary>(`${BASE}/topics/${topicId}/summary`),
  });
}

export function usePodcastEpisode(topicId: string) {
  return useQuery({
    queryKey: ['review-material', 'podcast', topicId],
    queryFn: () => readJson<PodcastEpisode>(`${BASE}/topics/${topicId}/podcast`),
  });
}

export function useCharacterVoices() {
  return useQuery({
    queryKey: ['review-material', 'character-voices'],
    queryFn: async (): Promise<CharacterVoice[]> =>
      (await readJson<CharacterVoice[]>(`${BASE}/character-voices`)) ?? [],
  });
}

export function useReviewSessionConfig(country: string | null) {
  return useQuery({
    queryKey: ['review-material', 'config', country],
    queryFn: () =>
      readJson<ReviewSessionConfig>(`${BASE}/config${country ? `?country=${country}` : ''}`),
  });
}

export function useReviewMaterialMutations(topicId: string) {
  const qc = useQueryClient();
  const invalidate = (piece: ReviewPiece) => {
    void qc.invalidateQueries({ queryKey: ['review-material', piece, topicId] });
    void qc.invalidateQueries({ queryKey: ['review-material', 'overview'] });
  };

  return {
    saveFlashcards: useMutation({
      mutationFn: (cards: FlashcardInput[]) =>
        sendJson<FlashcardDeck>(`${BASE}/topics/${topicId}/flashcards`, 'PUT', { cards }),
      onSuccess: () => invalidate('flashcards'),
    }),
    saveSummary: useMutation({
      mutationFn: (content: string) =>
        sendJson<TopicSummary>(`${BASE}/topics/${topicId}/summary`, 'PUT', { content }),
      onSuccess: () => invalidate('summary'),
    }),
    savePodcast: useMutation({
      mutationFn: (input: { title: string | null; script: ScriptSegment[] }) =>
        sendJson<PodcastEpisode>(`${BASE}/topics/${topicId}/podcast`, 'PUT', input),
      onSuccess: () => invalidate('podcast'),
    }),
    approveScript: useMutation({
      mutationFn: () =>
        sendJson<{ status: PodcastState }>(
          `${BASE}/topics/${topicId}/podcast/approve-script`,
          'POST',
        ),
      onSuccess: () => invalidate('podcast'),
    }),
    // `POST .../podcast/generate-audio` existe en el backend pero todavía no se
    // llama desde acá: responde 409 TTS_NOT_CONFIGURED hasta que el founder elija
    // proveedor de voces, y el botón queda deshabilitado con esa explicación.
    confirmAudio: useMutation({
      mutationFn: (input: { key: string; durationSeconds: number }) =>
        sendJson<PodcastEpisode>(`${BASE}/topics/${topicId}/podcast/audio/confirm`, 'POST', input),
      onSuccess: () => invalidate('podcast'),
    }),
    generateWithAi: useMutation({
      mutationFn: ({ piece, count }: { piece: ReviewPiece; count?: number }) =>
        sendJson<{ generated: number }>(
          `${BASE}/topics/${topicId}/pieces/${piece}/generate`,
          'POST',
          count === undefined ? {} : { count },
        ),
      onSuccess: (_data, { piece }) => invalidate(piece),
    }),
    setPublished: useMutation({
      mutationFn: ({ piece, published }: { piece: ReviewPiece; published: boolean }) =>
        sendJson<{ status: string }>(
          `${BASE}/topics/${topicId}/pieces/${piece}/${published ? 'publish' : 'unpublish'}`,
          'POST',
        ),
      onSuccess: (_data, { piece }) => invalidate(piece),
    }),
  };
}

/** Pide la URL firmada para subir el audio DIRECTO a R2 (el BFF solo firma). */
export async function presignPodcastAudio(
  topicId: string,
  input: { filename: string; contentType: string },
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const result = await sendJson<{ uploadUrl: string; publicUrl: string }>(
    `${BASE}/topics/${topicId}/podcast/audio/presign`,
    'POST',
    input,
  );
  if (!result) throw new Error('El backend no devolvió la URL de subida');
  return result;
}

export function useCharacterVoiceMutations() {
  const qc = useQueryClient();
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['review-material', 'character-voices'] });

  return {
    create: useMutation({
      mutationFn: (input: CharacterVoiceInput) =>
        sendJson<CharacterVoice>(`${BASE}/character-voices`, 'POST', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: CharacterVoiceInput & { id: string }) =>
        sendJson<CharacterVoice>(`${BASE}/character-voices/${id}`, 'PATCH', input),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) =>
        sendJson<CharacterVoice>(`${BASE}/character-voices/${id}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

export function useReviewSessionConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { country: string | null; dailyCardCap: number }) =>
      sendJson<ReviewSessionConfig>(`${BASE}/config`, 'PUT', input),
    onSuccess: (_data, input) =>
      void qc.invalidateQueries({ queryKey: ['review-material', 'config', input.country] }),
  });
}
