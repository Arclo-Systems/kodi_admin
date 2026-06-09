import { requireAction } from '@/lib/guard';
import { AchievementsTable } from './achievements-table';

export const metadata = { title: 'Logros' };

export default async function AchievementsPage() {
  const user = await requireAction('economy:achievement:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Logros</h1>
        <p className="text-muted-foreground">
          Catálogo de logros: condición, recompensa, activación y re-otorgamiento manual.
        </p>
      </div>
      <AchievementsTable role={user.role} />
    </div>
  );
}
