import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// Acciones de campaña: approve | send | cancel (todas POST sin body).
const ALLOWED = new Set(['approve', 'send', 'cancel']);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  if (!ALLOWED.has(action)) {
    return Response.json({ message: 'Acción no válida.' }, { status: 400 });
  }
  return forwardToBackend(req, 'POST', `/v1/admin/messaging/campaigns/${id}/${action}`);
}
