import { Suspense } from 'react';
import { requireAction } from '@/lib/guard';
import { Skeleton } from '@/components/ui/skeleton';
import { IdsReference } from './ids-reference';

export const metadata = { title: 'IDs de materias y temas' };

export default async function IdsPage() {
  await requireAction('content:question:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">IDs de materias y temas</h1>
        <p className="text-muted-foreground">Copiá los IDs para armar tu CSV de importación.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <IdsReference />
      </Suspense>
    </div>
  );
}
