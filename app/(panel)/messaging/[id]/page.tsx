import { requireAction } from '@/lib/guard';
import { CampaignDetail } from './campaign-detail';

export const metadata = { title: 'Campaña' };

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('view:messaging');
  const { id } = await params;
  return <CampaignDetail id={id} />;
}
