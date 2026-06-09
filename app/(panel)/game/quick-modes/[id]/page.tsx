import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { QuickModeDetail } from './quick-mode-detail';

export const metadata = { title: 'Sesión rápida' };

export default async function QuickModeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAction('view:game');
  const { id } = await params;
  const canAnnul = canWithScope(user.role, user.isGlobalScope, 'game:annul');
  return <QuickModeDetail id={id} canAnnul={canAnnul} />;
}
