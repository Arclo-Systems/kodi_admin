import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { ArenasList } from '../arenas-list';

export const metadata = { title: 'Arena' };

export default async function ArenasPage() {
  const user = await requireAction('view:game');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Arena</h1>
        <p className="text-muted-foreground">
          Arena de supervivencia (rápida, especial y privada): inspección, anulación y programación.
        </p>
      </div>
      <ArenasList canSchedule={can(user.role, 'game:schedule')} />
    </div>
  );
}
