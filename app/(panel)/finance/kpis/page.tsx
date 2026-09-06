import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceKpis } from '../finance-kpis';

export const metadata = { title: 'KPIs · Finanzas' };

export default async function FinanceKpisPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="KPIs"
        description="Caja de suscripciones, MRR estimado, clientes, churn, ARPU, LTV y CAC del mes."
      />
      <FinanceKpis />
    </div>
  );
}
