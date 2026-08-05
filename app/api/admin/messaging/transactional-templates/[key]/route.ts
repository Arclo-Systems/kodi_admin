import { NextRequest, NextResponse } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';
import { TX_TEMPLATE_KEYS } from '@/lib/tx-templates';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!TX_TEMPLATE_KEYS.has(key)) {
    return NextResponse.json({ message: 'Plantilla no encontrada' }, { status: 404 });
  }
  return forwardToBackend(req, 'PATCH', `/v1/admin/messaging/transactional-templates/${key}`);
}
