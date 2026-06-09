import { requireAction } from '@/lib/guard';
import { VocItemsTable } from './voc-items-table';

export const metadata = { title: 'Ítems vocacionales' };

export default async function VocationalItemsPage() {
  await requireAction('content:vocational:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ítems del test vocacional</h1>
        <p className="text-muted-foreground">
          Banco de enunciados RIASEC (Holland) del test vocacional, agrupados por dimensión. El
          orden define la secuencia en que se presentan.
        </p>
      </div>
      <VocItemsTable />
    </div>
  );
}
