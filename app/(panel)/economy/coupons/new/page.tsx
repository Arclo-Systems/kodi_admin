import { requireAction } from '@/lib/guard';
import { CouponForm } from '../coupon-form';

export const metadata = { title: 'Nuevo cupón' };

export default async function NewCouponPage() {
  await requireAction('economy:coupon:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo cupón</h1>
        <p className="text-muted-foreground">Creá un cupón de establecimiento para un sponsor.</p>
      </div>
      <CouponForm />
    </div>
  );
}
