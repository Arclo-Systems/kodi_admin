import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'GET',
    `/v1/admin/game/modes/${mode}/ranking${qs ? `?${qs}` : ''}`,
  );
}
