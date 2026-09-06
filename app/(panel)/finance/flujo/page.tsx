import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceCashFlow } from '../finance-cash-flow';

export const metadata = { title: 'Flujo de caja · Finanzas' };

export default async function FinanceCashFlowPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Flujo de caja"
        description="Entradas y salidas de cada caja y banco, por moneda."
      />
      <FinanceCashFlow />
    </div>
  );
}
