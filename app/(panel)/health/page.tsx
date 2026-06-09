import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { HealthSummary } from './health-summary';

export const metadata: Metadata = { title: 'Health' };

export default async function HealthPage() {
  await requireAction('view:health');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health</h1>
        <p className="text-muted-foreground">Estado de servicios, colas y dependencias.</p>
      </div>
      <HealthSummary />
    </div>
  );
}
