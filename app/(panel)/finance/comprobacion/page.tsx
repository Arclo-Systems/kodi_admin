import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceTrialBalance } from '../finance-trial-balance';

export const metadata = { title: 'Comprobación · Finanzas' };

export default async function FinanceTrialBalancePage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Comprobación"
        description="Débitos contra créditos del período, con la diferencia siempre a la vista."
      />
      <FinanceTrialBalance />
    </div>
  );
}
