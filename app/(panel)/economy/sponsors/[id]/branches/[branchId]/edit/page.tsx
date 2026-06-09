import { requireAction } from '@/lib/guard';
import { SponsorBranchForm } from '../../../../sponsor-branch-form';

export const metadata = { title: 'Editar sucursal' };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  await requireAction('economy:sponsor:write');
  const { id, branchId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar sucursal</h1>
        <p className="text-muted-foreground">Ajustá la ubicación o los datos de la sucursal.</p>
      </div>
      <SponsorBranchForm sponsorId={id} branchId={branchId} />
    </div>
  );
}
