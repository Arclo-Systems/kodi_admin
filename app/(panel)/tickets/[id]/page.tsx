import { requireAction } from '@/lib/guard';
import { TicketDetail } from './ticket-detail';

export const metadata = { title: 'Ticket' };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('view:tickets');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ticket</h1>
      <TicketDetail id={id} />
    </div>
  );
}
