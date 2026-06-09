import { requireAction } from '@/lib/guard';
import { TicketsTable } from './tickets-table';

export const metadata = { title: 'Tickets' };

export default async function TicketsPage() {
  await requireAction('view:tickets');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-muted-foreground">
          Reportes de usuario: problemas de preguntas, sugerencias y bugs. Triage:
          tomá, resolvé o descartá.
        </p>
      </div>
      <TicketsTable />
    </div>
  );
}
