import { requireAction } from '@/lib/guard';
import { MissionForm } from '../../mission-form';

export const metadata = { title: 'Editar template de misión' };

export default async function EditMissionTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('economy:mission:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar template de misión</h1>
        <p className="text-muted-foreground">Modificá meta, recompensas y estado.</p>
      </div>
      <MissionForm templateId={id} />
    </div>
  );
}
