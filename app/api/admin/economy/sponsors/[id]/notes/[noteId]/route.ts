import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/economy/sponsors/${id}/notes/${noteId}`);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  return forwardToBackend(req, 'DELETE', `/v1/admin/economy/sponsors/${id}/notes/${noteId}`);
}
