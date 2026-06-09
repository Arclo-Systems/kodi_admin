import { requireAction } from '@/lib/guard';
import { SponsorForm } from '../sponsor-form';

export const metadata = { title: 'Nuevo sponsor' };

export default async function NewSponsorPage() {
  await requireAction('economy:sponsor:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo sponsor</h1>
        <p className="text-muted-foreground">Datos, contacto, fiscal y contrato.</p>
      </div>
      <SponsorForm />
    </div>
  );
}
