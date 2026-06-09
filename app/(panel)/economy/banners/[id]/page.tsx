import { requireAction } from '@/lib/guard';
import { BannerDetail } from '../banner-detail';

export const metadata = { title: 'Banner' };

export default async function BannerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAction('economy:banner:read');
  const { id } = await params;

  return <BannerDetail id={id} role={user.role} />;
}
