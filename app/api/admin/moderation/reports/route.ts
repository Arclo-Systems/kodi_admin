import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(req, 'GET', `/v1/admin/moderation/reports${qs ? `?${qs}` : ''}`);
}
