import { requireAction } from '@/lib/guard';
import { FinancePageHeader } from '../finance-page-header';
import { FinanceForecast } from '../finance-forecast';

export const metadata = { title: 'Proyección · Finanzas' };

export default async function FinanceForecastPage() {
  await requireAction('view:finance');
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Proyección"
        description="Hacia dónde va la recta de ingresos y gastos, y cuántos meses aguanta la caja."
      />
      <FinanceForecast />
    </div>
  );
}
