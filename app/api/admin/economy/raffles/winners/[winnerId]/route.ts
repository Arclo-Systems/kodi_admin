import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ winnerId: string }> },
) {
  const { winnerId } = await params;
  return forwardToBackend(req, 'PATCH', `/v1/admin/economy/raffles/winners/${winnerId}`);
}
