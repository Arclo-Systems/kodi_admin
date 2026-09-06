import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// PUT y no PATCH: el backend reemplaza las líneas de forma atómica. Lo que viaja
// es el presupuesto completo, no un parche.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'PUT', `/v1/admin/finance/budgets/${id}/lines`);
}
