import { NextRequest, NextResponse } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// Acciones de workflow sobre una pregunta. Whitelist anti open-proxy.
const ALLOWED = new Set(['submit-review', 'approve', 'reject', 'delete', 'restore']);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ message: 'Acción no permitida' }, { status: 404 });
  }
  return forwardToBackend(req, 'POST', `/v1/admin/content/questions/${id}/${action}`);
}
