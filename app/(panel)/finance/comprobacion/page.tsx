import { requireAction } from '@/lib/guard';
import { FinanceTrialBalance } from '../finance-trial-balance';

export const metadata = { title: 'Comprobación · Finanzas' };

export default async function FinanceTrialBalancePage() {
  await requireAction('view:finance');
  return <FinanceTrialBalance />;
}
