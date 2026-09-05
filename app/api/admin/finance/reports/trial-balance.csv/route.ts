import { NextRequest } from 'next/server';
import { forwardDownloadToBackend } from '@/lib/proxy';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardDownloadToBackend(req, `/v1/admin/finance/reports/trial-balance.csv${qs ? `?${qs}` : ''}`);
}
