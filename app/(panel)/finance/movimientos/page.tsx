import { requireAction } from '@/lib/guard';
import { FinanceEntriesTable } from '../finance-entries-table';

export const metadata = { title: 'Movimientos · Finanzas' };

export default async function FinanceEntriesPage() {
  await requireAction('view:finance');
  return <FinanceEntriesTable />;
}
