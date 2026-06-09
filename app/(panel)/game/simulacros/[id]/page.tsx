import { requireAction } from '@/lib/guard';
import { canWithScope } from '@/lib/permissions';
import { SimulacroDetail } from './simulacro-detail';

export const metadata = { title: 'Simulacro' };

export default async function SimulacroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAction('view:game');
  const { id } = await params;
  const canAnnul = canWithScope(user.role, user.isGlobalScope, 'game:annul');
  return <SimulacroDetail id={id} canAnnul={canAnnul} />;
}
