import { requireAction } from '@/lib/guard';
import { QuickModesList } from '../quick-modes-list';

export const metadata = { title: 'Modos rápidos' };

export default async function QuickModesPage() {
  await requireAction('view:game');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modos rápidos</h1>
        <p className="text-muted-foreground">
          Contrarreloj y Supervivencia: inspección y anulación (reversa de Kolones).
        </p>
      </div>
      <QuickModesList />
    </div>
  );
}
