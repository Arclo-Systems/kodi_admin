import { requireAction } from '@/lib/guard';
import { AchievementDetail } from '../achievement-detail';

export const metadata = { title: 'Logro' };

export default async function AchievementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAction('economy:achievement:read');
  const { id } = await params;

  return <AchievementDetail id={id} role={user.role} />;
}
