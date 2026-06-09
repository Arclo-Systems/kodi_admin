import { requireAction } from '@/lib/guard';
import { BannerForm } from '../banner-form';

export const metadata = { title: 'Nuevo banner' };

export default async function NewBannerPage() {
  await requireAction('economy:banner:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo banner</h1>
        <p className="text-muted-foreground">Sponsor, placement, vigencia y peso, con vista previa.</p>
      </div>
      <BannerForm />
    </div>
  );
}
