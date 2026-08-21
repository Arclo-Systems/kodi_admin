import { requireAction } from '@/lib/guard';
import { SkusPanel } from './skus-panel';

export const metadata = { title: 'Catálogo de SKUs' };

export default async function SkusPage() {
  await requireAction('economy:monetization:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de SKUs</h1>
        <p className="text-muted-foreground">
          La allowlist que traduce lo que cobra Play a un plan de Kodi. Solo lectura: se genera del
          mismo criterio con el que se crean los productos en Play Console.
        </p>
      </div>
      <SkusPanel />
    </div>
  );
}
