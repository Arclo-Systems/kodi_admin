import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchJson } from './fetch-json';
import { ApiError, isUnauthorized } from './bff';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchJson', () => {
  it('desenvuelve el envelope { data } del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { data: { total: 7 } })),
    );

    await expect(fetchJson<{ total: number }>('/api/admin/x')).resolves.toEqual({
      total: 7,
    });
  });

  it('tira ApiError con el status y el mensaje del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          error: { code: 'VALIDATION_ERROR', message: 'Falta el título' },
        }),
      ),
    );

    await expect(fetchJson('/api/admin/x')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Falta el título',
    });
  });

  it('marca los 401 como sesión caída', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, {})));

    const error = await fetchJson('/api/admin/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(isUnauthorized(error)).toBe(true);
  });

  it('no confunde otros errores con sesión caída', () => {
    expect(isUnauthorized(new Error('network'))).toBe(false);
    expect(isUnauthorized(new ApiError('X', 'x', 500))).toBe(false);
  });
});
