import { requireAction } from '@/lib/guard';
import { FlagsPanel } from './flags-panel';

export const metadata = { title: 'Interruptores de compras' };

export default async function FlagsPage() {
  await requireAction('economy:store-ops:global');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Interruptores de compras</h1>
        <p className="text-muted-foreground">
          El valor efectivo de cada kill-switch tal como lo ve el backend ahora mismo.
        </p>
      </div>
      <FlagsPanel />
    </div>
  );
}
