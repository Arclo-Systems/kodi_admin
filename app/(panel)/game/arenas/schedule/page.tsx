import { requireAction } from '@/lib/guard';
import { ScheduleEspecialForm } from './schedule-especial-form';

export const metadata = { title: 'Programar Arena Especial' };

export default async function ScheduleEspecialPage() {
  await requireAction('game:schedule');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Programar Arena Especial</h1>
        <p className="text-muted-foreground">
          Evento puntual: módulo, fecha/hora y premios por tramo de puesto.
        </p>
      </div>
      <ScheduleEspecialForm />
    </div>
  );
}
