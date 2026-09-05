import { requireAction } from '@/lib/guard';
import { FinanceLedger } from '../finance-ledger';

export const metadata = { title: 'Mayor · Finanzas' };

export default async function FinanceLedgerPage() {
  await requireAction('view:finance');
  return <FinanceLedger />;
}
