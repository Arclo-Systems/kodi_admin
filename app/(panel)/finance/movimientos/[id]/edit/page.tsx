import { requireAction } from '@/lib/guard';
import { FinanceEntryForm } from '../../../finance-entry-form';

export const metadata = { title: 'Editar movimiento · Finanzas' };

export default async function EditFinanceEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('finance:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar movimiento</h1>
        <p className="text-muted-foreground">Modificá los datos del gasto o ingreso.</p>
      </div>
      <FinanceEntryForm entryId={id} />
    </div>
  );
}
