import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  return forwardToBackend(req, 'GET', '/v1/admin/game/wheel-config');
}

export async function PUT(req: NextRequest) {
  return forwardToBackend(req, 'PUT', '/v1/admin/game/wheel-config');
}
