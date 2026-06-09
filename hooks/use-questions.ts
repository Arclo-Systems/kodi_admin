'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type QuestionStatus = 'draft' | 'review' | 'active' | 'inactive';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GenerationSource = 'manual' | 'csv_import' | 'ai_generated';

export type QuestionListItem = {
  id: string;
  text: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  generationSource: GenerationSource;
  moduleId: string;
  subjectId: string;
  topicId: string;
  createdAt: string;
};

export type QuestionListQuery = {
  moduleId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  search?: string;
  page: number;
  pageSize: number;
};

type QuestionListPage = { items: QuestionListItem[]; total: number; page: number; pageSize: number };

export function useQuestions(query: QuestionListQuery) {
  return useQuery({
    queryKey: ['questions', query],
    queryFn: async (): Promise<QuestionListPage> => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === '') continue;
        params.set(k, String(v));
      }
      const res = await fetch(`/api/admin/content/questions?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch questions failed');
      return (
        unwrapData<QuestionListPage>(await res.json()) ?? {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        }
      );
    },
  });
}

export type QuestionOption = { id: string; text: string };
export type QuestionDetail = {
  id: string;
  moduleId: string;
  subjectId: string;
  topicId: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  generationSource: GenerationSource;
  version: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  module: { shortName: string; country: string };
  subject: { name: string };
  topic: { name: string };
};

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    enabled: !!id,
    queryFn: async (): Promise<QuestionDetail | undefined> => {
      const res = await fetch(`/api/admin/content/questions/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch question failed');
      return unwrapData<QuestionDetail>(await res.json());
    },
  });
}

export type QuestionWorkflowAction = 'submit-review' | 'approve' | 'reject' | 'delete' | 'restore';

export function useQuestionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: QuestionWorkflowAction }) => {
      const res = await fetch(`/api/admin/content/questions/${id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Error en la acción');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] });
      qc.invalidateQueries({ queryKey: ['question'] });
    },
  });
}
