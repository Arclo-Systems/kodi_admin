import { requireAction } from '@/lib/guard';
import { RaffleDetail } from '../raffle-detail';

export const metadata = { title: 'Premiación' };

export default async function RaffleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:raffle:read');
  const { id } = await params;

  return <RaffleDetail id={id} />;
}
