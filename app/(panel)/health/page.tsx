import type { Metadata } from 'next';
import { requireAction } from '@/lib/guard';
import { HealthIntegrations } from './health-integrations';
import { HealthSummary } from './health-summary';

export const metadata: Metadata = { title: 'Health' };

export default async function HealthPage() {
  // `view:health` lo tienen los cuatro roles, pero el chequeo de integraciones
  // es admin-only en el backend: para el resto la sección no se dibuja en vez
  // de pintar tres integraciones "caídas" que en realidad son un 403.
  const admin = await requireAction('view:health');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health</h1>
        <p className="text-muted-foreground">Estado de servicios, colas y dependencias.</p>
      </div>
      <HealthSummary />
      {admin.role === 'admin' && <HealthIntegrations />}
    </div>
  );
}
