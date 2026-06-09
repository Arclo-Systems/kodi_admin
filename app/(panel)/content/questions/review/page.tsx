import { requireAction } from '@/lib/guard';
import { ReviewSelected } from './review-selected';

export const metadata = { title: 'Revisar seleccionadas' };

export default async function ReviewSelectedPage() {
  const user = await requireAction('content:question:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revisar preguntas seleccionadas</h1>
        <p className="text-muted-foreground">
          Revisá las preguntas y aplicá la acción según su estado.
        </p>
      </div>
      <ReviewSelected role={user.role} />
    </div>
  );
}
