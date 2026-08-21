import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const AT = 'admin_at=at-nuevo; Max-Age=900; Path=/; HttpOnly; SameSite=Lax';
const RT =
  'admin_rt=rt-nuevo; Max-Age=2592000; Path=/v1/admin/auth; HttpOnly; SameSite=Lax';

function backendResponse(status: number, setCookies: string[]): Response {
  return {
    status,
    json: async () => (status === 200 ? { data: { ok: true } } : {}),
    headers: { getSetCookie: () => setCookies },
  } as unknown as Response;
}

function requestWithCookies(cookie: string): NextRequest {
  return new NextRequest('http://localhost:3001/api/auth/refresh', {
    method: 'POST',
    headers: { cookie },
  });
}

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://backend.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reenvía la cookie de sesión al refresh del backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse(200, [AT, RT]));
    vi.stubGlobal('fetch', fetchMock);

    await POST(requestWithCookies('admin_rt=rt-viejo'));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/v1/admin/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: { cookie: 'admin_rt=rt-viejo' },
      }),
    );
  });

  it('reemite las cookies del backend y publica admin_at_exp', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(backendResponse(200, [AT, RT])),
    );

    const res = await POST(requestWithCookies('admin_rt=rt-viejo'));

    expect(res.status).toBe(200);
    expect(res.cookies.get('admin_at')?.value).toBe('at-nuevo');
    expect(res.cookies.get('admin_rt')?.value).toBe('rt-nuevo');
    expect(Number(res.cookies.get('admin_at_exp')?.value)).toBeGreaterThan(
      Date.now(),
    );
  });

  it('propaga el rechazo del backend sin tocar cookies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse(401, [])));

    const res = await POST(requestWithCookies('admin_rt=rt-invalido'));

    expect(res.status).toBe(401);
    expect(res.cookies.getAll()).toHaveLength(0);
  });
});
