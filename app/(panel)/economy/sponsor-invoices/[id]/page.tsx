import { requireAction } from '@/lib/guard';
import { InvoiceDetailView } from '../invoice-detail';

export const metadata = { title: 'Factura' };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAction('economy:sponsor:read');
  const { id } = await params;

  return <InvoiceDetailView id={id} />;
}
