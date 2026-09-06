import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

// Devuelve el ENLACE firmado, no el archivo: el objeto vive en R2 privado y sale
// por una URL de vida corta que el browser descarga directo.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return forwardToBackend(
    req,
    'GET',
    `/v1/admin/finance/reports/accountant-package/${id}/url${qs ? `?${qs}` : ''}`,
  );
}
