import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'GET', `/v1/admin/finance/entries/${id}`);
}

// No hay DELETE: un movimiento contabilizado se anula (POST .../void), nunca se
// borra — borrarlo dejaría el asiento sin el hecho económico que lo originó.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/finance/entries/${id}`);
}
