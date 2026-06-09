import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(req, 'GET', `/v1/admin/economy/store${qs ? `?${qs}` : ''}`);
}

export async function POST(req: NextRequest) {
  return forwardToBackend(req, 'POST', '/v1/admin/economy/store');
}
