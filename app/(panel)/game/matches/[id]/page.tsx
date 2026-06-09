import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { MatchDetail } from './match-detail';

export const metadata = { title: 'Partida' };

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAction('view:game');
  const { id } = await params;
  const canAnnul = canWithScope(user.role, user.isGlobalScope, 'game:annul');
  return <MatchDetail id={id} canAnnul={canAnnul} />;
}
