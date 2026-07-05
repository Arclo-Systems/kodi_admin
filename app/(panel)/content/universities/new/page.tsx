import { requireAction } from '@/lib/guard';
import { UniversityForm } from '../university-form';

export const metadata = { title: 'Nueva universidad' };

export default async function NewUniversityPage() {
  await requireAction('content:university:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva universidad</h1>
        <p className="text-muted-foreground">
          Pesos de la nota de admisión y escala de puntaje.
        </p>
      </div>
      <UniversityForm />
    </div>
  );
}
