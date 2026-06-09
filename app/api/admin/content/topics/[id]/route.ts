import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/content/topics/${id}`);
}
