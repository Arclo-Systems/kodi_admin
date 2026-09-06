import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinancePlayOrders } from '../finance-play-orders';

export const metadata = { title: 'Google Play · Finanzas' };

export default async function FinancePlayOrdersPage() {
  const user = await requireAction('view:finance');
  // Mirar las órdenes se abre con `view:finance`; re-encolar el asiento escribe
  // en el libro (a través del worker), así que va detrás de `finance:write`.
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Play"
        description="Órdenes de Google Play: qué cobró, qué se llevó de comisión y cuáles faltan asentar."
      />
      <FinancePlayOrders canWrite={canWrite} />
    </div>
  );
}
