import { requireAction } from '@/lib/guard';
import { StoreForm } from '../store-form';

export const metadata = { title: 'Nuevo ítem de tienda' };

export default async function NewStoreItemPage() {
  await requireAction('economy:store:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo ítem de tienda</h1>
        <p className="text-muted-foreground">Categoría, tipo, precio, preview y disponibilidad.</p>
      </div>
      <StoreForm />
    </div>
  );
}
