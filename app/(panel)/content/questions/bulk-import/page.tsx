import { requireAction } from '@/lib/guard';
import { BulkImportReview } from './bulk-import-review';

export const metadata = { title: 'Revisar importación' };

export default async function BulkImportPage() {
  await requireAction('content:question:write');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revisar importación (CSV)</h1>
        <p className="text-muted-foreground">
          Validá las filas antes de confirmar. Las válidas entran como borrador.
        </p>
      </div>
      <BulkImportReview />
    </div>
  );
}
