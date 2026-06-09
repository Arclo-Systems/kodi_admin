import { requireAction } from '@/lib/guard';
import { BannersTable } from './banners-table';

export const metadata = { title: 'Banners' };

export default async function BannersPage() {
  await requireAction('economy:banner:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Banners</h1>
        <p className="text-muted-foreground">
          Banners de sponsors por país y placement, con vigencia, peso y stats.
        </p>
      </div>
      <BannersTable />
    </div>
  );
}
