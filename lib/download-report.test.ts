import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadReport } from './download-report';
import { ApiError } from './bff';

const createObjectURL = vi.fn(() => 'blob:mock');
const revokeObjectURL = vi.fn();
const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');

function response(init: {
  ok: boolean;
  status: number;
  body?: unknown;
  disposition?: string;
}): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: async () => init.body,
    blob: async () => new Blob(['Código;Cuenta\n'], { type: 'text/csv' }),
    headers: new Headers(init.disposition ? { 'content-disposition': init.disposition } : {}),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  click.mockImplementation(() => {});
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('downloadReport — un error no se guarda como si fuera el archivo', () => {
  it('un 413 se muestra con el mensaje del backend, sin descargar nada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          ok: false,
          status: 413,
          body: {
            error: {
              code: 'REPORT_TOO_LARGE',
              message: 'El mayor del rango tiene 62 000 líneas: acotá las fechas.',
            },
          },
        }),
      ),
    );

    await expect(downloadReport('/api/admin/finance/reports/ledger.csv', 'mayor.csv')).rejects.toThrow(
      'El mayor del rango tiene 62 000 líneas: acotá las fechas.',
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('un 401 conserva el status para que el panel sepa que se cayó la sesión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          ok: false,
          status: 401,
          body: { error: { code: 'UNAUTHORIZED', message: 'Se requiere autenticación admin.' } },
        }),
      ),
    );

    await expect(
      downloadReport('/api/admin/finance/reports/pnl.csv', 'resultados.csv'),
    ).rejects.toMatchObject({ status: 401, message: 'Se requiere autenticación admin.' });
    expect(click).not.toHaveBeenCalled();
  });

  it('un error sin envelope no queda mudo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 500, body: null })),
    );

    await expect(downloadReport('/x.csv', 'x.csv')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('downloadReport — el archivo se entrega con el nombre del backend', () => {
  it('descarga el blob y usa el filename del content-disposition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          ok: true,
          status: 200,
          disposition: 'attachment; filename="mayor_6900_2026-01-01_2026-09-30.csv"',
        }),
      ),
    );

    await downloadReport('/api/admin/finance/reports/ledger.csv?accountId=a1', 'mayor.csv');

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('sin content-disposition cae al nombre de respaldo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, status: 200 })));

    await downloadReport('/api/admin/finance/reports/pnl.csv', 'resultados.csv');

    expect(click).toHaveBeenCalled();
  });
});
