import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// El período y la moneda viajan en el QUERY, también en el POST: el paquete es
// siempre de un mes completo y no hay body que mandar.
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'GET',
    `/v1/admin/finance/reports/accountant-package${qs ? `?${qs}` : ''}`,
  );
}

export async function POST(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'POST',
    `/v1/admin/finance/reports/accountant-package${qs ? `?${qs}` : ''}`,
  );
}
