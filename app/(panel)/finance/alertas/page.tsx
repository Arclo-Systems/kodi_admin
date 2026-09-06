import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceAlerts } from '../finance-alerts';

export const metadata = { title: 'Alertas · Finanzas' };

export default async function FinanceAlertsPage() {
  const user = await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Alertas"
        description="Qué se vigila todos los días —pista de caja, sobregiro y órdenes sin asentar— y qué disparó."
      />
      <FinanceAlerts canWrite={can(user.role, 'finance:write')} />
    </div>
  );
}
