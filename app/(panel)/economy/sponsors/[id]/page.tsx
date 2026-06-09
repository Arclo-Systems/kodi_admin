import { requireAction } from '@/lib/guard';
import { SponsorDetail } from '../sponsor-detail';

export const metadata = { title: 'Sponsor' };

export default async function SponsorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('economy:sponsor:read');
  const { id } = await params;

  return <SponsorDetail id={id} role={user.role} />;
}
