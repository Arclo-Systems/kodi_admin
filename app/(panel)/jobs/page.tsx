import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { JobsTable } from './jobs-table';
import { JobsSchedules } from './jobs-schedules';

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

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Programados</h2>
          <p className="text-muted-foreground text-sm">
            Qué corre solo y cada cuánto. La hora del cron va en UTC; Costa Rica
            es 6 horas menos.
          </p>
        </div>
        <JobsSchedules />
      </section>
    </div>
  );
}
