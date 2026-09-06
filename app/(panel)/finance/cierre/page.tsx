import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinancePeriodClosing } from '../finance-period-closing';

export const metadata = { title: 'Cierre mensual · Finanzas' };

export default async function FinancePeriodClosingPage() {
  const user = await requireAction('view:finance');
  // Ver los períodos se abre con `view:finance`; cerrar uno decide qué asientos
  // acepta el mayor de ahí en adelante, así que va detrás de `finance:write`.
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Cierre mensual"
        description="Qué mes está abierto, qué le falta para poder cerrarse y qué se cerró. Un mes cerrado rechaza todo asiento con su fecha."
      />
      <FinancePeriodClosing canWrite={canWrite} />
    </div>
  );
}
