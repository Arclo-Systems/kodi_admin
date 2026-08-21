import { requireAction } from '@/lib/guard';
import { IncidenciasView } from './incidencias-panel';

export const metadata = { title: 'Incidencias de tienda' };

export default async function IncidenciasPage() {
  await requireAction('economy:monetization:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidencias de tienda</h1>
        <p className="text-muted-foreground">
          Compras que el pipeline no pudo cerrar solo, más los saldos de Kokos que quedaron en
          negativo por un reembolso.
        </p>
      </div>
      <IncidenciasView />
    </div>
  );
}
