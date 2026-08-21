import { requireAction } from '@/lib/guard';
import { ComprasPanel } from './compras-panel';

export const metadata = { title: 'Compras recientes' };

export default async function ComprasPage() {
  await requireAction('economy:store-ops:global');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compras recientes</h1>
        <p className="text-muted-foreground">
          Notificaciones de Play: tipo, estado, latencia y reintentos. El recibo se guarda redactado,
          así que nunca aparece completo.
        </p>
      </div>
      <ComprasPanel />
    </div>
  );
}
