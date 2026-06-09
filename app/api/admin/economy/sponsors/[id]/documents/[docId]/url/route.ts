import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  return forwardToBackend(req, 'GET', `/v1/admin/economy/sponsors/${id}/documents/${docId}/url`);
}
