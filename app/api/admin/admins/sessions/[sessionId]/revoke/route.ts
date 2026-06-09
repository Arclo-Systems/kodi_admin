import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  return forwardToBackend(req, 'POST', `/v1/admin/admins/sessions/${sessionId}/revoke`);
}
