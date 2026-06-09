import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return forwardToBackend(req, 'POST', `/v1/admin/economy/store/inventory/${userId}`);
}
