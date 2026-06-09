import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  return forwardToBackend(req, 'DELETE', `/v1/admin/economy/sponsors/${id}/documents/${docId}`);
}
