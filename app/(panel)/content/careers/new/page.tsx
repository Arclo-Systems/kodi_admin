import { requireAction } from '@/lib/guard';
import { CareerForm } from '../career-form';

export const metadata = { title: 'Nueva carrera' };

export default async function NewCareerPage() {
  await requireAction('content:career:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva carrera</h1>
        <p className="text-muted-foreground">
          Código RIASEC, datos de interés y mercado laboral (OLaP).
        </p>
      </div>
      <CareerForm />
    </div>
  );
}
