import { requireAction } from '@/lib/guard';
import { StoreForm } from '../../store-form';

export const metadata = { title: 'Editar ítem de tienda' };

export default async function EditStoreItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('economy:store:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar ítem de tienda</h1>
        <p className="text-muted-foreground">Modificá precio, disponibilidad, assets y estado.</p>
      </div>
      <StoreForm itemId={id} />
    </div>
  );
}
