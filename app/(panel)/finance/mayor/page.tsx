import { Suspense } from 'react';
import { requireAction } from '@/lib/guard';
import { Skeleton } from '@/components/ui/skeleton';
import { FinanceLedger } from '../finance-ledger';

export const metadata = { title: 'Mayor · Finanzas' };

export default async function FinanceLedgerPage() {
  await requireAction('view:finance');
  // `FinanceLedger` siembra sus filtros desde la query (la comprobación enlaza
  // acá con cuenta, moneda y rango): `useSearchParams` exige un límite de Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FinanceLedger />
    </Suspense>
  );
}
