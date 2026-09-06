import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceAccountantPackage } from '../finance-accountant-package';

export const metadata = { title: 'Paquete del contador · Finanzas' };

export default async function FinanceAccountantPackagePage() {
  const user = await requireAction('view:finance');
  const canWrite = canWithScope(user.role, user.isGlobalScope, 'finance:write');

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Paquete del contador"
        description="El juego contable completo de un mes en PDF y CSV, listo para mandar. Cada generación crea una versión nueva y no pisa la anterior."
      />
      <FinanceAccountantPackage canWrite={canWrite} />
    </div>
  );
}
