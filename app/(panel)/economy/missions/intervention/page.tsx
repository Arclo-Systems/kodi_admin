import { requireAction } from '@/lib/guard';
import { MissionIntervention } from '../mission-intervention';

export const metadata = { title: 'Intervención de misiones' };

export default async function MissionInterventionPage() {
  await requireAction('economy:mission:intervene');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Intervención de misiones</h1>
        <p className="text-muted-foreground">
          Buscá las misiones de un usuario y completá, reiniciá o sustituí (queda en el audit log).
        </p>
      </div>
      <MissionIntervention />
    </div>
  );
}
