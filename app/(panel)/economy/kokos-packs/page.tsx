import { requireAction } from '@/lib/guard';
import { KokosPacksManager } from './kokos-packs-manager';

export const metadata = { title: 'Kokos-packs' };

export default async function KokosPacksPage() {
  await requireAction('economy:kokos-pack:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kokos-packs</h1>
        <p className="text-muted-foreground">
          Packs de Kokos (compra IAP): cantidad, precio en USD y SKU del store. Para retirar un pack,
          ponelo Inactivo (no se borran porque tienen compras asociadas).
        </p>
      </div>
      <KokosPacksManager />
    </div>
  );
}
