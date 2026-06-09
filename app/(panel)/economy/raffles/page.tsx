import { requireAction } from '@/lib/guard';
import { RafflesTable } from './raffles-table';

export const metadata = { title: 'Premiaciones' };

export default async function RafflesPage() {
  await requireAction('economy:raffle:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Premiaciones</h1>
        <p className="text-muted-foreground">
          Premiaciones mensuales por mérito (Liga Genio): premio, ganadores y entrega.
        </p>
      </div>
      <RafflesTable />
    </div>
  );
}
