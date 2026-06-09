import { requireAction } from '@/lib/guard';
import { StoreTable } from './store-table';

export const metadata = { title: 'Tienda' };

export default async function StorePage() {
  await requireAction('economy:store:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tienda</h1>
        <p className="text-muted-foreground">
          Ítems de estilo: catálogo, ventana de disponibilidad y ajuste de inventario.
        </p>
      </div>
      <StoreTable />
    </div>
  );
}
