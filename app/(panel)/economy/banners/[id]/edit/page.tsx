import { requireAction } from '@/lib/guard';
import { BannerForm } from '../../banner-form';

export const metadata = { title: 'Editar banner' };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:banner:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar banner</h1>
        <p className="text-muted-foreground">Modificá placement, vigencia, peso e imagen.</p>
      </div>
      <BannerForm bannerId={id} />
    </div>
  );
}
