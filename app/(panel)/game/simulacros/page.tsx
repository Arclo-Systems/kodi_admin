import { requireAction } from '@/lib/guard';
import { SimulacrosList } from '../simulacros-list';

export const metadata = { title: 'Simulacros' };

export default async function SimulacrosPage() {
  await requireAction('view:game');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Simulacros</h1>
        <p className="text-muted-foreground">Simulacros de examen: inspección y anulación.</p>
      </div>
      <SimulacrosList />
    </div>
  );
}
