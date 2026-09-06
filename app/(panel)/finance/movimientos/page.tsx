import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceEntriesTable } from '../finance-entries-table';

export const metadata = { title: 'Movimientos · Finanzas' };

export default async function FinanceEntriesPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Movimientos"
        description="Alta, edición y anulación de gastos e ingresos, cada uno con su asiento."
      />
      <FinanceEntriesTable />
    </div>
  );
}
