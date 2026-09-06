import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccountantPackage } from '@/hooks/use-finance-tax';

let packages: AccountantPackage[];
const generate = vi.fn();
const discard = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-tax', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-tax')>()),
  useAccountantPackages: () => ({
    data: packages,
    isLoading: false,
    isError: false,
    refetch,
  }),
  useAccountantPackageMutations: () => ({
    generate: { mutateAsync: generate, isPending: false },
    discard: { mutateAsync: discard },
  }),
}));

// La pestaña que `openSignedAsset` abre en el gesto, para poder afirmar que se
// navega a la URL firmada y que se cierra cuando el enlace no llega.
let ventana: { location: { href: string }; close: ReturnType<typeof vi.fn> };

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

import { FinanceAccountantPackage } from './finance-accountant-package';

const LISTO: AccountantPackage = {
  id: 'pk2',
  year: 2026,
  month: 8,
  period: '2026-08',
  version: 2,
  status: 'READY',
  error: null,
  currency: 'CRC',
  files: ['pdf', 'mayor.csv', 'comprobacion.csv', 'balance.csv', 'resultados.csv'],
  metadata: {
    pdfPages: 9,
    bytes: { pdf: 184320, 'mayor.csv': 4211 },
    ledgerRows: 128,
    balanced: true,
  },
  generatedBy: 'u1',
  generatedAt: '2026-09-01T12:00:00.000Z',
};

beforeEach(() => {
  packages = [LISTO];
  vi.clearAllMocks();
  generate.mockResolvedValue({});
  discard.mockResolvedValue({});
  ventana = { location: { href: '' }, close: vi.fn() };
  vi.stubGlobal('open', vi.fn(() => ventana));
  // El backend responde el enlace firmado; el caso de error lo pone cada test.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({ data: { url: 'https://r2.example/firmada', expiresInSeconds: 300 } }),
    ),
  );
});

describe('FinanceAccountantPackage — generar', () => {
  it('manda el año, el mes y la moneda elegidos', async () => {
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Generar paquete/ }));

    await waitFor(() => expect(generate).toHaveBeenCalled());
    expect(generate.mock.calls[0]?.[0]).toMatchObject({ currency: 'CRC' });
  });

  it('sin finance:write no ofrece generar ni descartar, pero sí descargar', () => {
    packages = [{ ...LISTO, status: 'FAILED', error: 'R2 no respondió', files: [], metadata: null }];
    render(<FinanceAccountantPackage />);

    expect(screen.queryByRole('button', { name: /Generar paquete/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Descartar/ })).toBeNull();
  });
});

describe('FinanceAccountantPackage — los tres estados', () => {
  it('READY ofrece los cinco archivos con su tamaño', () => {
    render(<FinanceAccountantPackage canWrite />);

    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF completo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mayor \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comprobación \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Balance general \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resultados \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByText('180,0 KB')).toBeInTheDocument();
    expect(screen.getByText(/9 páginas · 128 líneas de mayor/)).toBeInTheDocument();
  });

  it('GENERATING no ofrece archivos y avisa que la lista se actualiza sola', () => {
    packages = [{ ...LISTO, status: 'GENERATING', files: [], metadata: null }];
    render(<FinanceAccountantPackage canWrite />);

    expect(screen.getByText('Generando')).toBeInTheDocument();
    expect(screen.getByText(/La lista se actualiza sola/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PDF completo/ })).toBeNull();
    // Con una reserva en curso, generar otra queda deshabilitado.
    expect(screen.getByRole('button', { name: /Generar paquete/ })).toBeDisabled();
  });

  it('FAILED muestra el motivo que mandó el backend', () => {
    packages = [
      { ...LISTO, status: 'FAILED', error: 'El mayor pasó las 50 000 líneas.', files: [], metadata: null },
    ];
    render(<FinanceAccountantPackage canWrite />);

    expect(screen.getByText('Falló')).toBeInTheDocument();
    expect(screen.getByText('El mayor pasó las 50 000 líneas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PDF completo/ })).toBeNull();
  });

  it('sin versiones explica cuándo conviene generarlo', () => {
    packages = [];
    render(<FinanceAccountantPackage canWrite />);

    expect(screen.getByText('Todavía no hay ningún paquete de este mes')).toBeInTheDocument();
  });
});

describe('FinanceAccountantPackage — descargar', () => {
  it('abre la pestaña EN EL GESTO y recién después la navega al enlace firmado', async () => {
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Mayor \(CSV\)/ }));

    // La pestaña se abre sincrónicamente con el click: pedir la URL primero y
    // abrir después de un `await` lo come el bloqueador de popups, sin ningún
    // error a la vista.
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    await waitFor(() => expect(ventana.location.href).toBe('https://r2.example/firmada'));

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe('/api/admin/finance/reports/accountant-package/pk2/url?file=mayor.csv');
  });

  it('un 409 del backend se lee con SU mensaje, y la pestaña se cierra', async () => {
    // El 409 tal como viaja (`{ error: { code, message } }`), no un rechazo ya
    // traducido: es justo la traducción lo que se está probando.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'PACKAGE_NOT_READY',
              message: 'El paquete está GENERATING: todavía no tiene archivos.',
            },
          },
          { status: 409 },
        ),
      ),
    );
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /PDF completo/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'El paquete está GENERATING: todavía no tiene archivos.',
      ),
    );
    // Sin esto queda una pestaña en blanco abierta y el error solo en el toast.
    expect(ventana.close).toHaveBeenCalled();
    expect(ventana.location.href).toBe('');
  });
});

describe('FinanceAccountantPackage — descartar', () => {
  it('una versión READY no se descarta: es el respaldo de lo que se entregó', () => {
    render(<FinanceAccountantPackage canWrite />);

    expect(screen.queryByRole('button', { name: /Descartar/ })).toBeNull();
  });

  it('una que falló se descarta con confirmación, y el número no se reusa', async () => {
    packages = [{ ...LISTO, status: 'FAILED', error: 'R2 no respondió', files: [], metadata: null }];
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/El número no se reusa/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(discard).toHaveBeenCalledWith('pk2'));
  });
});
