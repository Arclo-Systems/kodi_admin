import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// BFF: proxy de /v1/admin/audit-log/by-resource (reenvía cookies + query params).
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(req, 'GET', `/v1/admin/audit-log/by-resource${qs ? `?${qs}` : ''}`);
}
