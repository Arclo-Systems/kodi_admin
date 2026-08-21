import { NextRequest, NextResponse } from 'next/server';
import { applyBackendSession, mergedCookieHeader } from '@/lib/session-cookies';

// Next 16 renombró `middleware.ts` → `proxy.ts` (función `proxy`). Misma API.
const PUBLIC_PATHS = ['/login', '/2fa-verify'];

type RefreshOutcome =
  | { status: 'ok'; setCookies: string[] }
  | { status: 'rejected' }
  | { status: 'unreachable' };

async function refreshSession(rt: string): Promise<RefreshOutcome> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/auth/refresh`,
      { method: 'POST', headers: { cookie: `admin_rt=${rt}` } },
    );
    if (!res.ok) return { status: 'rejected' };
    // getSetCookie() devuelve cada cookie por separado (admin_at + admin_rt);
    // get('set-cookie') las colapsa en una sola → usar el array.
    return { status: 'ok', setCookies: res.headers.getSetCookie?.() ?? [] };
  } catch {
    return { status: 'unreachable' };
  }
}

function toLogin(req: NextRequest, reason?: 'expired'): NextResponse {
  const url = new URL('/login', req.url);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  // Los handlers de /api/auth/* son la sesión misma (login, logout, refresh a demanda):
  // no se gatean ni se refrescan, gatearlos rompería el propio login.
  if (pathname.startsWith('/api/auth/')) return NextResponse.next();

  const isApi = pathname.startsWith('/api/');
  if (!isApi && PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const at = req.cookies.get('admin_at')?.value;
  const rt = req.cookies.get('admin_rt')?.value;

  if (at) return NextResponse.next();

  // Los XHR del panel no redirigen: el backend responde 401 y el cliente decide
  // (ver el manejo global de 401 en components/providers/query-provider.tsx).
  if (!rt) return isApi ? NextResponse.next() : toLogin(req);

  // Los prefetch de <Link> llegan de a decenas por navegación. Refrescar en cada uno
  // multiplicaría la rotación del refresh token; se corta acá (204 = nada que cachear,
  // en vez de un redirect a /login que el Router Cache guardaría como destino real) y
  // deja que refresque la navegación de verdad.
  if (req.headers.get('next-router-prefetch'))
    return new NextResponse(null, { status: 204 });

  const refreshed = await refreshSession(rt);

  if (refreshed.status === 'ok') {
    const headers = new Headers(req.headers);
    headers.set(
      'cookie',
      mergedCookieHeader(req.headers.get('cookie'), refreshed.setCookies),
    );
    const res = NextResponse.next({ request: { headers } });
    applyBackendSession(res.cookies, refreshed.setCookies);
    return res;
  }

  // Refresh rechazado (rt inválido/expirado) o backend inalcanzable: NUNCA borrar las
  // cookies. Una request perdedora de una rotación concurrente traía justamente este
  // resultado y se llevaba puesta la sesión que otra acababa de emitir.
  if (isApi) return NextResponse.next();
  return refreshed.status === 'rejected' ? toLogin(req, 'expired') : toLogin(req);
}

export const config = {
  // `/api/admin/*` va explícito: con un matcher de exclusión Next 16 NO corre el proxy en
  // route handlers (verificado), y sin él un XHR con el access vencido nunca refrescaba.
  // El resto: todo salvo assets de public/ (cualquier ruta con extensión) e internos de Next.
  matcher: [
    '/api/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
