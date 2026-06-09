'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function send(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(b.message ?? 'Error');
  }
}

export type CreateModuleInput = {
  country: string;
  examType: string;
  shortName: string;
  fullName: string;
  icon: string;
  version: string;
  hasAdmissionCutoffs: boolean;
};
export type UpdateModuleInput = {
  shortName?: string;
  fullName?: string;
  icon?: string;
  version?: string;
  hasAdmissionCutoffs?: boolean;
};
export type CreateSubjectInput = {
  moduleId: string;
  name: string;
  shortName: string;
  icon: string;
  colorHex: string;
  region?: string | null;
};
export type UpdateSubjectInput = {
  name?: string;
  shortName?: string;
  icon?: string;
  colorHex?: string;
  region?: string | null;
};
export type CreateTopicInput = { subjectId: string; name: string; examWeight?: number | null };
export type UpdateTopicInput = { name?: string; examWeight?: number | null };
export type ReorderInput = { parentId: string; orderedIds: string[] };

export function useContentTreeMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['modules-tree'] });

  return {
    createModule: useMutation({
      mutationFn: (b: CreateModuleInput) => send('/api/admin/content/modules', 'POST', b),
      onSuccess,
    }),
    updateModule: useMutation({
      mutationFn: ({ id, ...b }: UpdateModuleInput & { id: string }) =>
        send(`/api/admin/content/modules/${id}`, 'PATCH', b),
      onSuccess,
    }),
    toggleModule: useMutation({
      mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
        send(`/api/admin/content/modules/${id}/toggle-active`, 'POST', { isActive }),
      onSuccess,
    }),
    duplicateModule: useMutation({
      mutationFn: ({ id, targetCountry }: { id: string; targetCountry: string }) =>
        send(`/api/admin/content/modules/${id}/duplicate`, 'POST', { targetCountry }),
      onSuccess,
    }),
    createSubject: useMutation({
      mutationFn: (b: CreateSubjectInput) => send('/api/admin/content/subjects', 'POST', b),
      onSuccess,
    }),
    updateSubject: useMutation({
      mutationFn: ({ id, ...b }: UpdateSubjectInput & { id: string }) =>
        send(`/api/admin/content/subjects/${id}`, 'PATCH', b),
      onSuccess,
    }),
    deleteSubject: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/subjects/${id}/delete`, 'POST'),
      onSuccess,
    }),
    reorderSubjects: useMutation({
      mutationFn: (v: ReorderInput) => send('/api/admin/content/subjects/reorder', 'POST', v),
      onSuccess,
    }),
    createTopic: useMutation({
      mutationFn: (b: CreateTopicInput) => send('/api/admin/content/topics', 'POST', b),
      onSuccess,
    }),
    updateTopic: useMutation({
      mutationFn: ({ id, ...b }: UpdateTopicInput & { id: string }) =>
        send(`/api/admin/content/topics/${id}`, 'PATCH', b),
      onSuccess,
    }),
    deleteTopic: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/topics/${id}/delete`, 'POST'),
      onSuccess,
    }),
    reorderTopics: useMutation({
      mutationFn: (v: ReorderInput) => send('/api/admin/content/topics/reorder', 'POST', v),
      onSuccess,
    }),
  };
}
