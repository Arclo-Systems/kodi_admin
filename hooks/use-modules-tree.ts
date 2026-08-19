'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';
import type { QuestionStatus } from '@/hooks/use-questions';

/** Desglose del nodo por estado de pregunta. Suma exactamente `questionCount`. */
export type TreeQuestionCounts = Record<QuestionStatus, number>;

export type TreeTopic = {
  id: string;
  name: string;
  order: number;
  examWeight: number | null;
  questionCount: number;
  questionCounts: TreeQuestionCounts;
  /**
   * Identidad visual del tema. Solo se carga en módulos de ADMISIÓN: ahí la
   * "materia" es el examen (PAA UCR, TEC) y lo que el estudiante percibe como
   * materia es el tema. En los demás modos queda en null.
   *
   * Sin arte de práctica: esa ilustración es de la materia. El tema solo tiene
   * arte propio dentro de la ruleta de Partida Kodi.
   */
  colorHex: string | null;
  wheelAssetUrl: string | null;
};
export type TreeSubject = {
  id: string;
  name: string;
  order: number;
  questionCount: number;
  questionCounts: TreeQuestionCounts;
  colorHex: string;
  /** Ilustración de práctica. */
  assetUrl: string | null;
  /** Arte del sector de la ruleta de Partida Kodi: se lee chico y en movimiento. */
  wheelAssetUrl: string | null;
  /**
   * Adenda B2 §10: conteo y duración del examen. Solo se cargan donde la materia
   * ES el examen — ADMISIÓN (UCR / UNA / TEC) y `per_subject` (PEN). null = usar
   * los del módulo.
   */
  examQuestionCount: number | null;
  examDurationMin: number | null;
  topics: TreeTopic[];
};
export type TreeModule = {
  id: string;
  country: string;
  shortName: string;
  fullName: string;
  isActive: boolean;
  questionCount: number;
  questionCounts: TreeQuestionCounts;
  examType: string;
  examMode: 'simple' | 'per_subject' | 'admission';
  colorHex: string;
  iconUrl: string | null;
  /** Personaje ESTÁTICO (card hero de práctica y tarjeta de compartir). */
  characterUrl: string | null;
  version: string;
  hasAdmissionCutoffs: boolean;
  /** Nota mínima para aprobar el examen (0-100). */
  approvalThreshold: number;
  /** Últimas N preguntas que no se le repiten al usuario. 0 = sin margen. */
  noRepeatWindowQuestions: number;
  /** De qué se arma el tablero de Partida Kodi. */
  duelCategorySource: 'subjects' | 'topics';
  /** Máximo de sectores de la ruleta. Si hay menos categorías, se usan todas. */
  duelCategoryCap: number;
  examDurationMin: number | null;
  examQuestionCount: number | null;
  /** Preguntas del examen sorpresa diario (Ola A). */
  surpriseQuestionCount: number;
  subjects: TreeSubject[];
};

export function useModulesTree(country?: string) {
  return useQuery({
    queryKey: ['modules-tree', country ?? null],
    queryFn: async (): Promise<TreeModule[]> => {
      const qs = country ? `?country=${country}` : '';
      const res = await fetch(`/api/admin/content/modules/tree${qs}`, { credentials: 'include' });
      // El mensaje del backend importa: el árbol es la única fuente del editor,
      // así que si falla hay que poder decir por qué en vez de mostrar el
      // formulario vacío o un "ya no existe" que sería mentira.
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'No se pudo cargar el árbol de contenido');
      }
      return unwrapData<TreeModule[]>(await res.json()) ?? [];
    },
  });
}
