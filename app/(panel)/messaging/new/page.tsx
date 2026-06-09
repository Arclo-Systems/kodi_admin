import { requireAction } from '@/lib/guard';
import { CampaignForm } from '@/components/admin/campaign-form';

export const metadata = { title: 'Nueva campaña' };

export default async function NewCampaignPage() {
  await requireAction('messaging:send');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva campaña broadcast</h1>
        <p className="text-muted-foreground">
          Elegí un segmento y redactá el mensaje. Los envíos a más de 1000 usuarios requieren aprobación.
        </p>
      </div>
      <CampaignForm mode="create" />
    </div>
  );
}
