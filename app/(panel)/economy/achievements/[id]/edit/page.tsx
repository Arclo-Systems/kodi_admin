import { requireAction } from '@/lib/guard';
import { AchievementForm } from '../../achievement-form';

export const metadata = { title: 'Editar logro' };

export default async function EditAchievementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAction('economy:achievement:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar logro</h1>
        <p className="text-muted-foreground">Modificá los datos del logro.</p>
      </div>
      <AchievementForm achievementId={id} />
    </div>
  );
}
