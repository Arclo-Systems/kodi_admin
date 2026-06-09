import { requireAction } from '@/lib/guard';
import { CouponDetail } from '../coupon-detail';

export const metadata = { title: 'Cupón' };

export default async function CouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('economy:coupon:read');
  const { id } = await params;

  return <CouponDetail id={id} role={user.role} />;
}
