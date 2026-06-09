import { requireAction } from '@/lib/guard';
import { CrossSellManager } from './cross-sell-manager';

export const metadata = { title: 'Cross-sell' };

export default async function CrossSellPage() {
  await requireAction('economy:cross-sell:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cross-sell</h1>
        <p className="text-muted-foreground">
          Sugerencias entre módulos: cuando el usuario está en el módulo origen, se le ofrece el
          destino con un mensaje.
        </p>
      </div>
      <CrossSellManager />
    </div>
  );
}
