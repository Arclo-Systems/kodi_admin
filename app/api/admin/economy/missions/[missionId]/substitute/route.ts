import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  return forwardToBackend(req, 'POST', `/v1/admin/economy/missions/${missionId}/substitute`);
}
