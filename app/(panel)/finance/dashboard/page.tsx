import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { PnlDashboard } from '../pnl-dashboard';

export const metadata = { title: 'Dashboard · Finanzas' };

export default async function FinanceDashboardPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Dashboard"
        description="Ingresos, costos y gastos del período, calculados desde el libro mayor."
      />
      <PnlDashboard />
    </div>
  );
}
