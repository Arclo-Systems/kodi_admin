import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceBalanceSheet } from '../finance-balance-sheet';

export const metadata = { title: 'Balance general · Finanzas' };

export default async function FinanceBalanceSheetPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Balance general"
        description="Activo, pasivo y patrimonio a una fecha, con la verificación del cuadre."
      />
      <FinanceBalanceSheet />
    </div>
  );
}
