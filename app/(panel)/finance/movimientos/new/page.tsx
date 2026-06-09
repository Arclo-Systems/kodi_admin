import { requireAction } from '@/lib/guard';
import { FinanceEntryForm } from '../../finance-entry-form';

export const metadata = { title: 'Nuevo movimiento · Finanzas' };

export default async function NewFinanceEntryPage() {
  await requireAction('finance:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo movimiento</h1>
        <p className="text-muted-foreground">
          Registrá un gasto o ingreso de la empresa. Las facturas de sponsor pagadas se cuentan
          aparte en el P&amp;L.
        </p>
      </div>
      <FinanceEntryForm />
    </div>
  );
}
