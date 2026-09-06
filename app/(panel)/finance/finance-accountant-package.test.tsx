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

const openSigned = vi.fn<(path: string) => Promise<void>>();
vi.mock('@/lib/signed-asset', () => ({
  openSignedAsset: (path: string) => openSigned(path),
}));

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
  openSigned.mockResolvedValue(undefined);
  vi.stubGlobal('open', vi.fn());
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
  it('abre el archivo con openSignedAsset, DENTRO del gesto del click', async () => {
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Mayor \(CSV\)/ }));

    // `openSignedAsset` abre la pestaña sincrónicamente y recién después le
    // asigna la URL firmada. Pedir la URL primero y llamar a `window.open`
    // después de un `await` lo come el bloqueador de popups, sin ningún error a
    // la vista: por eso el componente NO puede tocar `window.open` él mismo.
    await waitFor(() =>
      expect(openSigned).toHaveBeenCalledWith(
        '/api/admin/finance/reports/accountant-package/pk2/url?file=mayor.csv',
      ),
    );
    expect(window.open).not.toHaveBeenCalled();
  });

  it('un paquete que no está listo se muestra como mensaje, no se baja al disco', async () => {
    openSigned.mockRejectedValue(new Error('El paquete todavía no está listo.'));
    render(<FinanceAccountantPackage canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /PDF completo/ }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('El paquete todavía no está listo.'),
    );
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
