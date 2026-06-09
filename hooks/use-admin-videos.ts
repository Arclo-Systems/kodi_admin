'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type VideoContext = 'practice' | 'game' | 'kokos' | 'any';

export const VIDEO_CONTEXT_LABELS: Record<VideoContext, string> = {
  practice: 'Práctica',
  game: 'Modos de juego',
  kokos: 'Kokos',
  any: 'Cualquiera',
};

export const VIDEO_CONTEXTS: VideoContext[] = ['practice', 'game', 'kokos', 'any'];
export const VIDEO_DURATIONS = [15, 30, 60, 120, 180] as const;

export type AdminVideo = {
  id: string;
  sponsorId: string;
  sponsorName: string;
  videoUrl: string;
  durationSec: number;
  country: string;
  moduleId: string | null;
  moduleShortName: string | null;
  context: VideoContext;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  impressionCount: number;
  completionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VideoListQuery = {
  sponsorId?: string;
  country?: string;
  context?: VideoContext;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

type VideoListPage = { items: AdminVideo[]; total: number; page: number; pageSize: number };

export type VideoInput = {
  sponsorId: string;
  videoUrl: string;
  durationSec: number;
  country: string;
  moduleId: string | null;
  context: VideoContext;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export type VideoUpdate = Partial<Omit<VideoInput, 'sponsorId' | 'country'>>;

const BASE = '/api/admin/economy/videos';

async function send(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<unknown> {
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

export function useAdminVideos(query: VideoListQuery) {
  return useQuery({
    queryKey: ['admin-videos', query],
    queryFn: async (): Promise<VideoListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`${BASE}?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch videos failed');
      return (
        unwrapData<VideoListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export function useAdminVideo(id: string) {
  return useQuery({
    queryKey: ['admin-video', id],
    enabled: !!id,
    queryFn: async (): Promise<AdminVideo | undefined> => {
      const res = await fetch(`${BASE}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch video failed');
      return unwrapData<AdminVideo>(await res.json());
    },
  });
}

export function useVideoMutations() {
  const qc = useQueryClient();
  const invalidate = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['admin-videos'] });
    if (id) qc.invalidateQueries({ queryKey: ['admin-video', id] });
  };
  return {
    create: useMutation({
      mutationFn: async (input: VideoInput): Promise<string> => {
        const body = await send(BASE, 'POST', input);
        return unwrapData<{ id: string }>(body)?.id ?? '';
      },
      onSuccess: () => invalidate(),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: VideoUpdate }) =>
        send(`${BASE}/${id}`, 'PATCH', input),
      onSuccess: (_d, { id }) => invalidate(id),
    }),
    remove: useMutation({
      mutationFn: (id: string) => send(`${BASE}/${id}`, 'DELETE'),
      onSuccess: () => invalidate(),
    }),
  };
}

// Sube el video en dos pasos: (1) pide una URL firmada al backend, (2) hace PUT directo a R2 con
// XMLHttpRequest para tener progreso (fetch no expone progreso de subida). Devuelve la URL pública.
export async function uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const presignRes = await fetch(`${BASE}/upload-url`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  if (!presignRes.ok) {
    const b = (await presignRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'No se pudo iniciar la subida');
  }
  const data = unwrapData<{ uploadUrl: string; publicUrl: string }>(await presignRes.json());
  if (!data?.uploadUrl || !data.publicUrl) throw new Error('Respuesta de subida inválida');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`La subida falló (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Error de red al subir el video'));
    xhr.send(file);
  });

  return data.publicUrl;
}
