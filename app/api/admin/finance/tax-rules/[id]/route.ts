import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// Solo PATCH: no hay DELETE. La tarifa con la que se calculó una factura
// emitida es el respaldo de ese monto, así que se retira con `deactivate`.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/finance/tax-rules/${id}`);
}
