import { requireAction } from '@/lib/guard';
import { MissionsTable } from './missions-table';

export const metadata = { title: 'Misiones' };

export default async function MissionsPage() {
  await requireAction('economy:mission:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Misiones</h1>
        <p className="text-muted-foreground">
          Plantillas de misiones diarias, configuración de cambio e intervención sobre usuarios.
        </p>
      </div>
      <MissionsTable />
    </div>
  );
}
