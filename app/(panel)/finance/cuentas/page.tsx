import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinanceAccountsTree } from '../finance-accounts-tree';

export const metadata = { title: 'Plan de cuentas · Finanzas' };

export default async function FinanceAccountsPage() {
  const user = await requireAction('view:finance');
  // La página se abre con `view:finance`; agregar o retirar una cuenta cambia el
  // plan con el que se asienta todo, así que va detrás de `finance:write`.
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');
  return <FinanceAccountsTree canWrite={canWrite} />;
}
