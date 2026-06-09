import { NextRequest, NextResponse } from 'next/server';
import { adaptBackendCookie } from '@/lib/bff';

// Next 16 renombró `middleware.ts` → `proxy.ts` (función `proxy`). Misma API.
const PUBLIC_PATHS = ['/login', '/2fa-verify'];

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Route handlers BFF (/api/*) proxyean al backend, que ya impone auth.
  // No deben redirigirse a /login (rompería el propio POST de login).
  if (pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const at = req.cookies.get('admin_at')?.value;
  const rt = req.cookies.get('admin_rt')?.value;

  if (!at && !rt) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Access token expirado pero hay refresh token → refresh server-side.
  if (!at && rt) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    try {
      const refreshRes = await fetch(`${apiUrl}/v1/admin/auth/refresh`, {
        method: 'POST',
        headers: { cookie: `admin_rt=${rt}` },
      });

      if (refreshRes.ok) {
        // getSetCookie() devuelve cada cookie por separado (admin_at + admin_rt);
        // get('set-cookie') las colapsa en una sola → usar el array.
        const res = NextResponse.next();
        for (const c of refreshRes.headers.getSetCookie?.() ?? []) {
          res.headers.append('set-cookie', adaptBackendCookie(c));
        }
        return res;
      }

      // Refresh rechazado (rt inválido/expirado) → limpiar cookies y a /login.
      const res = NextResponse.redirect(new URL('/login', req.url));
      res.cookies.delete('admin_at');
      res.cookies.delete('admin_rt');
      return res;
    } catch {
      // Backend inalcanzable (caído/reiniciando/deploy): NO crashear la app.
      // Redirigimos a /login SIN borrar el rt — un blip transitorio no debe
      // forzar re-login: al volver el backend, el rt sigue sirviendo para refrescar.
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // No gatear assets estáticos de public/ (cualquier ruta con extensión: /logo.svg,
  // /icon.svg, etc.) ni los internos de Next. El resto de rutas sí pasa por el gate.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
