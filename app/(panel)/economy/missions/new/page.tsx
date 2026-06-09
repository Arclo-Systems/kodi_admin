import { requireAction } from '@/lib/guard';
import { MissionForm } from '../mission-form';

export const metadata = { title: 'Nuevo template de misión' };

export default async function NewMissionTemplatePage() {
  await requireAction('economy:mission:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo template de misión</h1>
        <p className="text-muted-foreground">Tipo, meta y recompensas (XP / Kokos / Kolones).</p>
      </div>
      <MissionForm />
    </div>
  );
}
