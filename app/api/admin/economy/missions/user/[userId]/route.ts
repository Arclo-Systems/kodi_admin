import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return forwardToBackend(req, 'GET', `/v1/admin/economy/missions/user/${userId}`);
}
