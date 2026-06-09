import { requireAction } from '@/lib/guard';
import { RiasecTypesTable } from './riasec-types-table';

export const metadata = { title: 'Tipos RIASEC' };

export default async function RiasecTypesPage() {
  await requireAction('content:vocational:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfiles de tipos RIASEC</h1>
        <p className="text-muted-foreground">
          Los 6 tipos base (Holland) que se muestran en el resultado del test. Editá título,
          resumen, descripción y fortalezas.
        </p>
      </div>
      <RiasecTypesTable />
    </div>
  );
}
