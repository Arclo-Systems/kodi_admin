import { Suspense } from 'react';
import { requireAction } from '@/lib/guard';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestionsTable } from './questions-table';

export const metadata = { title: 'Preguntas' };

export default async function QuestionsPage() {
  const user = await requireAction('view:content');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Preguntas</h1>
        <p className="text-muted-foreground">Banco de preguntas — workflow, bulk CSV y generación con IA</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <QuestionsTable role={user.role} />
      </Suspense>
    </div>
  );
}
