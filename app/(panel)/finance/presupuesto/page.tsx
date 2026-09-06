import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceBudgets } from '../finance-budgets';
import { FinanceBudgetVariance } from '../finance-budget-variance';

export const metadata = { title: 'Presupuesto · Finanzas' };

export default async function FinanceBudgetPage() {
  const user = await requireAction('view:finance');

  return (
    <div className="space-y-8">
      <FinancePageHeader
        title="Presupuesto"
        description="Cuánto se pensaba gastar y cobrar cada mes, y cuánto se gastó y se cobró de verdad."
      />
      {/* Las dos mitades de la misma pregunta: el plan y su contraste contra el
          mayor. Separarlas en dos rutas obligaría a ir y volver para entender un
          número. */}
      <FinanceBudgets canWrite={can(user.role, 'finance:write')} />
      <FinanceBudgetVariance />
    </div>
  );
}
