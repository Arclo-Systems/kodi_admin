import { requireAction } from '@/lib/guard';
import { SponsorsBoard } from './sponsors-board';

export const metadata = { title: 'Sponsors' };

export default async function SponsorsPage() {
  await requireAction('economy:sponsor:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sponsors</h1>
        <p className="text-muted-foreground">
          Pipeline de sponsors: arrastrá las tarjetas entre etapas. Click para ver el detalle, CRM y
          facturas.
        </p>
      </div>
      <SponsorsBoard />
    </div>
  );
}
