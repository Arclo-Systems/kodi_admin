import { NextRequest, NextResponse } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

const ALLOWED = new Set(['schedule', 'publish', 'unpublish', 'duplicate']);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ message: 'Acción no permitida' }, { status: 404 });
  }
  return forwardToBackend(req, 'POST', `/v1/admin/content/news/${id}/${action}`);
}
