import { requireAction } from '@/lib/guard';
import { InvoiceForm } from '../invoice-form';

export const metadata = { title: 'Nueva factura' };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ sponsorId?: string }>;
}) {
  await requireAction('economy:sponsor:write');
  const { sponsorId } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva factura</h1>
        <p className="text-muted-foreground">
          Se crea como borrador; luego ajustás líneas y precios antes de emitir.
        </p>
      </div>
      <InvoiceForm initialSponsorId={sponsorId} />
    </div>
  );
}
