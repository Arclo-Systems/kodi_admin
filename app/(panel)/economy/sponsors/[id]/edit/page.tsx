import { requireAction } from '@/lib/guard';
import { SponsorForm } from '../../sponsor-form';

export const metadata = { title: 'Editar sponsor' };

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:sponsor:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar sponsor</h1>
        <p className="text-muted-foreground">Modificá datos, contacto, fiscal y contrato.</p>
      </div>
      <SponsorForm sponsorId={id} />
    </div>
  );
}
