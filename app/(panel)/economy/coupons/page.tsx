import { requireAction } from '@/lib/guard';
import { CouponsTable } from './coupons-table';

export const metadata = { title: 'Cupones' };

export default async function CouponsPage() {
  const user = await requireAction('economy:coupon:read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cupones</h1>
        <p className="text-muted-foreground">
          Cupones de establecimientos por país y tier, con canjes y tracking.
        </p>
      </div>
      <CouponsTable role={user.role} />
    </div>
  );
}
