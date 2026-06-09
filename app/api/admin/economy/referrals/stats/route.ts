import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  return forwardToBackend(req, 'GET', '/v1/admin/economy/referrals/stats');
}
