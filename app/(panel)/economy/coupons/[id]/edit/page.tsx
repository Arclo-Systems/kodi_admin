import { requireAction } from '@/lib/guard';
import { CouponForm } from '../../coupon-form';

export const metadata = { title: 'Editar cupón' };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:coupon:write');
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar cupón</h1>
        <p className="text-muted-foreground">Modificá los datos del cupón.</p>
      </div>
      <CouponForm couponId={id} />
    </div>
  );
}
