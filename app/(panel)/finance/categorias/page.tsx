import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinanceCategoriesManager } from '../finance-categories-manager';

export const metadata = { title: 'Categorías · Finanzas' };

export default async function FinanceCategoriesPage() {
  const user = await requireAction('view:finance');
  // La página se abre con `view:finance`; mapear una categoría a una cuenta es
  // escritura contable y va detrás de `finance:write`.
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');
  return <FinanceCategoriesManager canWrite={canWrite} />;
}
