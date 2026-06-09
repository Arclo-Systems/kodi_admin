import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/messaging/transactional-templates/${key}`);
}
