'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<void> {
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

/** Identidad visual del módulo: color de marca, icono y personaje estático. */
type ModuleVisuals = {
  colorHex?: string;
  iconUrl?: string | null;
  characterUrl?: string | null;
};

export type CreateModuleInput = ModuleVisuals & {
  country: string;
  examType: string;
  examMode?: 'simple' | 'per_subject' | 'admission';
  shortName: string;
  fullName: string;
  version: string;
  hasAdmissionCutoffs: boolean;
  /** Simulacro: duración y cantidad de preguntas. null = sin definir. */
  examDurationMin?: number | null;
  examQuestionCount?: number | null;
  /** Preguntas del examen sorpresa diario. */
  surpriseQuestionCount?: number;
};
export type UpdateModuleInput = ModuleVisuals & {
  shortName?: string;
  fullName?: string;
  /** Decide cómo se calculan predictor y estadísticas — lista cerrada. */
  examType?: string;
  examMode?: 'simple' | 'per_subject' | 'admission';
  version?: string;
  hasAdmissionCutoffs?: boolean;
  /** Nota mínima para dar el examen por aprobado (0-100). */
  approvalThreshold?: number;
  /** Últimas N preguntas que no se repiten al usuario. 0 = sin margen. */
  noRepeatWindowQuestions?: number;
  /** De qué se arma el tablero de Partida Kodi: materias o temas. */
  duelCategorySource?: 'subjects' | 'topics';
  /** Máximo de sectores de la ruleta (2–12). */
  duelCategoryCap?: number;
  /** Simulacro: duración y cantidad de preguntas. null = sin definir. */
  examDurationMin?: number | null;
  examQuestionCount?: number | null;
  /** Preguntas del examen sorpresa diario (1-50). */
  surpriseQuestionCount?: number;
};
/** Dos artes por nodo: la ilustración de práctica y el sector de la ruleta. */
type NodeAssets = {
  assetUrl?: string | null;
  wheelAssetUrl?: string | null;
};

/**
 * Adenda §10: cifras del examen; solo se mandan donde la materia ES el examen
 * (admisión y `per_subject`).
 */
type SubjectExamConfig = {
  examQuestionCount?: number | null;
  examDurationMin?: number | null;
};

export type CreateSubjectInput = NodeAssets &
  SubjectExamConfig & {
    moduleId: string;
    name: string;
    shortName: string;
    colorHex: string;
    region?: string | null;
  };
export type UpdateSubjectInput = NodeAssets &
  SubjectExamConfig & {
    name?: string;
    shortName?: string;
    colorHex?: string;
    region?: string | null;
  };
/**
 * El tema suma color propio; solo se llena en módulos de admisión. Sin arte de
 * práctica: esa ilustración es de la materia.
 */
type TopicVisuals = {
  colorHex?: string | null;
  wheelAssetUrl?: string | null;
};

export type CreateTopicInput = TopicVisuals & {
  subjectId: string;
  name: string;
  examWeight?: number | null;
};
export type UpdateTopicInput = TopicVisuals & {
  name?: string;
  examWeight?: number | null;
};
export type ReorderInput = { parentId: string; orderedIds: string[] };

export function useContentTreeMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['modules-tree'] });

  return {
    createModule: useMutation({
      mutationFn: (b: CreateModuleInput) => send('/api/admin/content/modules', 'POST', b),
      onSuccess,
    }),
    deleteModule: useMutation({
      mutationFn: (id: string) => send(`/api/admin/content/modules/${id}`, 'DELETE'),
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
