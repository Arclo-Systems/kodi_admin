import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(req, 'GET', `/v1/admin/leagues/config${qs ? `?${qs}` : ''}`);
}

export async function PUT(req: NextRequest) {
  return forwardToBackend(req, 'PUT', '/v1/admin/leagues/config');
}
