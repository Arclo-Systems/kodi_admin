import { requireAction } from '@/lib/guard';
import { UniversitiesTable } from './universities-table';

export const metadata = { title: 'Universidades' };

export default async function UniversitiesPage() {
  await requireAction('content:university:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Universidades</h1>
        <p className="text-muted-foreground">
          Pesos de la nota de admisión (examen vs. presentación) y escala de puntaje por
          universidad.
        </p>
      </div>
      <UniversitiesTable />
    </div>
  );
}
