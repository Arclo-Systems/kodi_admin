import { requireAction } from '@/lib/guard';
import { PnlDashboard } from './pnl-dashboard';

export const metadata = { title: 'Finanzas' };

export default async function FinancePage() {
  await requireAction('view:finance');
  return <PnlDashboard />;
}
