import { requireAction } from '@/lib/guard';
import { SponsorBranchForm } from '../../../sponsor-branch-form';

export const metadata = { title: 'Nueva sucursal' };

export default async function NewBranchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:sponsor:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva sucursal</h1>
        <p className="text-muted-foreground">Ubicá la sucursal en el mapa y completá los datos.</p>
      </div>
      <SponsorBranchForm sponsorId={id} />
    </div>
  );
}
