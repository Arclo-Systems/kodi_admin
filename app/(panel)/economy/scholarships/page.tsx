import { requireAction } from '@/lib/guard';
import { ScholarshipsTable } from './scholarships-table';

export const metadata = { title: 'Becas' };

export default async function ScholarshipsPage() {
  await requireAction('economy:scholarship:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Becas</h1>
        <p className="text-muted-foreground">
          Solicitudes del formulario público de la landing: revisar, aprobar (activa la suscripción)
          o rechazar.
        </p>
      </div>
      <ScholarshipsTable />
    </div>
  );
}
