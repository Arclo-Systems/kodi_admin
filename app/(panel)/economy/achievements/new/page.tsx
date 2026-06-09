import { requireAction } from '@/lib/guard';
import { AchievementForm } from '../achievement-form';

export const metadata = { title: 'Nuevo logro' };

export default async function NewAchievementPage() {
  await requireAction('economy:achievement:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo logro</h1>
        <p className="text-muted-foreground">Definí condición, recompensa y activación.</p>
      </div>
      <AchievementForm />
    </div>
  );
}
