import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceExchangeRates } from '../finance-exchange-rates';

export const metadata = { title: 'Tipos de cambio · Finanzas' };

export default async function FinanceExchangeRatesPage() {
  const user = await requireAction('view:finance');
  // Ver las tasas se abre con `view:finance`; cargar o borrar una cambia lo que
  // dicen todos los reportes consolidados, así que va detrás de `finance:write`.
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Tipos de cambio"
        description="Tasas cargadas a mano, para las conversiones y el consolidado de los reportes."
      />
      <FinanceExchangeRates canWrite={canWrite} />
    </div>
  );
}
