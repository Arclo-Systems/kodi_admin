import { Suspense } from 'react';
import { requireAction } from '@/lib/guard';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceLedger } from '../finance-ledger';

export const metadata = { title: 'Mayor · Finanzas' };

export default async function FinanceLedgerPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Mayor"
        description="Los movimientos de una cuenta en una moneda, con su saldo corrido."
      />
      {/* `FinanceLedger` siembra sus filtros desde la query (la comprobación enlaza
          acá con cuenta, moneda y rango): `useSearchParams` exige un límite de Suspense. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FinanceLedger />
      </Suspense>
    </div>
  );
}
