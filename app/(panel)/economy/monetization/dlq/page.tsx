import { requireAction } from '@/lib/guard';
import { DlqPanel } from './dlq-panel';

export const metadata = { title: 'Cola de descartes' };

export default async function DlqPage() {
  await requireAction('economy:store-ops:global');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cola de descartes (DLQ)</h1>
        <p className="text-muted-foreground">
          Notificaciones de Play que fallaron antes de entrar al pipeline: contenido, motivo del
          descarte y cuántas entregas se intentaron.
        </p>
      </div>
      <DlqPanel />
    </div>
  );
}
