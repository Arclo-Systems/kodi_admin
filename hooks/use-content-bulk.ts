'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T };
  return (json.data ?? json) as T;
}

export type QuestionBulkStatus = 'active' | 'inactive' | 'review' | 'draft';

export function useQuestionsBulk() {
  const qc = useQueryClient();
  // También el árbol: muestra el desglose por estado de cada nodo, así que un
  // cambio masivo lo desactualiza igual que a la lista de preguntas.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['questions'] });
    qc.invalidateQueries({ queryKey: ['modules-tree'] });
  };
  return {
    setStatus: useMutation({
      mutationFn: (input: { ids: string[]; status: QuestionBulkStatus }) =>
        post<{ updated: number }>('/api/admin/content/questions/bulk-status', input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (ids: string[]) =>
        post<{ deleted: number; skipped: number }>('/api/admin/content/questions/bulk-delete', {
          ids,
        }),
      onSuccess: invalidate,
    }),
  };
}

export function useNewsBulk() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['news'] });
  return {
    publish: useMutation({
      mutationFn: (ids: string[]) =>
        post<{ published: number }>('/api/admin/content/news/bulk-publish', { ids }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (ids: string[]) =>
        post<{ deleted: number }>('/api/admin/content/news/bulk-delete', { ids }),
      onSuccess: invalidate,
    }),
  };
}
