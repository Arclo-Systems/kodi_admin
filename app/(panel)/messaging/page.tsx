import { requireAction } from '@/lib/guard';
import { CampaignsTable } from './campaigns-table';
import { MessagingNav } from './messaging-nav';

export const metadata = { title: 'Mensajería' };

export default async function MessagingPage() {
  const user = await requireAction('view:messaging');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mensajería</h1>
        <p className="text-muted-foreground">
          Campañas de email/push: 1-a-1 (desde el usuario) y broadcast por segmento.
        </p>
      </div>
      <MessagingNav role={user.role} isGlobalScope={user.isGlobalScope} />
      <CampaignsTable />
    </div>
  );
}
