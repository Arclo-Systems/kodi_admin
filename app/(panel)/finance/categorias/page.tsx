import { requireAction } from '@/lib/guard';
import { FinanceCategoriesManager } from '../finance-categories-manager';

export const metadata = { title: 'Categorías · Finanzas' };

export default async function FinanceCategoriesPage() {
  await requireAction('view:finance');
  return <FinanceCategoriesManager />;
}
