'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { AdminRole } from '@/lib/auth';
import { useQuestion } from '@/hooks/use-questions';
import { QuestionForm } from './question-form';
import { QuestionActions } from './question-actions';

export function QuestionDetail({ id, role }: { id: string; role: AdminRole }) {
  const { data, isLoading } = useQuestion(id);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data) return <p className="text-muted-foreground">No se encontró la pregunta.</p>;

  return (
    <div className="space-y-6">
      <QuestionActions question={data} role={role} />
      <QuestionForm mode="edit" questionId={id} initial={data} />
    </div>
  );
}
