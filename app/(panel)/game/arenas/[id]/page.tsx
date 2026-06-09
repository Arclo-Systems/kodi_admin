import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { ArenaDetail } from './arena-detail';

export const metadata = { title: 'Arena' };

export default async function ArenaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAction('view:game');
  const { id } = await params;
  const canAnnul = canWithScope(user.role, user.isGlobalScope, 'game:annul');
  return <ArenaDetail id={id} canAnnul={canAnnul} />;
}
