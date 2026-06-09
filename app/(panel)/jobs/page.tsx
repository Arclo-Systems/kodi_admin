import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { JobsTable } from './jobs-table';

export const metadata: Metadata = { title: 'Jobs' };

export default async function JobsPage() {
  await requireAction('view:jobs');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-muted-foreground">
          Cola de procesamiento (gamification): estado, reintentos y limpieza.
        </p>
      </div>
      <JobsTable />
    </div>
  );
}
