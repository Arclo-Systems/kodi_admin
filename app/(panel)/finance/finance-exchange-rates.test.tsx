import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/bff';
import type { ExchangeRate, ExchangeRatePage } from '@/hooks/use-finance';

let page: ExchangeRatePage;
let listError = false;
const refetch = vi.fn();
const createRate = vi.fn();
const removeRate = vi.fn();

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useExchangeRates: () => ({
    data: listError ? undefined : page,
    isLoading: false,
    isError: listError,
    error: listError ? new Error('Se cayó la lista') : null,
    refetch,
  }),
  useExchangeRateMutations: () => ({
    create: { mutateAsync: createRate, isPending: false },
    remove: { mutateAsync: removeRate, isPending: false },
  }),
}));

import { FinanceExchangeRates } from './finance-exchange-rates';

const RATE: ExchangeRate = {
  id: 'r1',
  date: '2026-09-15',
  fromCurrency: 'CRC',
  toCurrency: 'USD',
  rate: '0.00196078',
  source: 'BCCR venta 2026-09-15',
  createdBy: 'admin-1',
  createdAt: '2026-09-15T18:00:00.000Z',
};

async function abrirAlta(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: 'Nueva tasa' }));
  return screen.findByRole('dialog');
}

async function elegir(dialog: HTMLElement, combobox: string, option: string): Promise<void> {
  fireEvent.click(within(dialog).getByRole('combobox', { name: combobox }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  vi.clearAllMocks();
  listError = false;
  page = { items: [RATE], total: 1, page: 1, pageSize: 20 };
});

describe('FinanceExchangeRates — la tabla', () => {
  it('lista la tasa con su par, su valor y su fuente', () => {
    render(<FinanceExchangeRates canWrite />);

    const fila = screen.getByText('0.00196078').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText('2026-09-15')).toBeInTheDocument();
    expect(within(fila).getByText('CRC → USD')).toBeInTheDocument();
    expect(within(fila).getByText('BCCR venta 2026-09-15')).toBeInTheDocument();
  });

  it('sin permiso de escritura no ofrece cargar ni borrar', () => {
    render(<FinanceExchangeRates canWrite={false} />);

    expect(screen.queryByRole('button', { name: 'Nueva tasa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull();
  });

  it('una lista caída no se lee como "no hay tasas"', () => {
    listError = true;
    render(<FinanceExchangeRates canWrite />);

    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no hay tipos de cambio cargados')).toBeNull();
  });
});

describe('FinanceExchangeRates — el alta valida antes de viajar', () => {
  it('exige la tasa y la fuente', async () => {
    render(<FinanceExchangeRates canWrite />);
    const dialog = await abrirAlta();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar tasa' }));

    // Las dos: la tasa y la fuente.
    expect(await within(dialog).findAllByText('Requerido')).toHaveLength(2);
    expect(
      within(dialog).getByText(/De dónde salió: "BCCR venta 2026-09-05"/),
    ).toBeInTheDocument();
    expect(createRate).not.toHaveBeenCalled();
  });

  it('rechaza una tasa en cero y una con más de 8 decimales', async () => {
    render(<FinanceExchangeRates canWrite />);
    const dialog = await abrirAlta();

    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText('Fuente'), { target: { value: 'BCCR' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar tasa' }));
    expect(await within(dialog).findByText('Mayor a 0')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Tasa'), {
      target: { value: '0.123456789' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar tasa' }));
    expect(await within(dialog).findByText('Hasta 8 decimales')).toBeInTheDocument();
    expect(createRate).not.toHaveBeenCalled();
  });

  it('manda la tasa como string, sin pasarla por Number', async () => {
    render(<FinanceExchangeRates canWrite />);
    const dialog = await abrirAlta();

    await elegir(dialog, 'De', 'CRC');
    await elegir(dialog, 'A', 'USD');
    fireEvent.change(within(dialog).getByLabelText('Tasa'), {
      target: { value: '0.00196078' },
    });
    fireEvent.change(within(dialog).getByLabelText('Fuente'), {
      target: { value: 'BCCR venta 2026-09-15' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar tasa' }));

    await waitFor(() =>
      expect(createRate).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: 'CRC',
          toCurrency: 'USD',
          rate: '0.00196078',
          source: 'BCCR venta 2026-09-15',
        }),
      ),
    );
  });

  it('el 409 de duplicado se muestra con el mensaje del backend', async () => {
    createRate.mockRejectedValueOnce(
      new ApiError(
        'EXCHANGE_RATE_EXISTS',
        'Ya hay un tipo de cambio CRC a USD para el 2026-09-15: borrá el que está si querés corregirlo.',
        409,
      ),
    );
    render(<FinanceExchangeRates canWrite />);
    const dialog = await abrirAlta();

    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '0.002' } });
    fireEvent.change(within(dialog).getByLabelText('Fuente'), { target: { value: 'BCCR' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar tasa' }));

    expect(
      await screen.findByText(/Ya hay un tipo de cambio CRC a USD para el 2026-09-15/),
    ).toBeInTheDocument();
  });
});

describe('FinanceExchangeRates — borrar pide confirmación', () => {
  it('borra recién después de confirmar', async () => {
    render(<FinanceExchangeRates canWrite />);

    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/CRC → USD del 2026-09-15/)).toBeInTheDocument();
    expect(removeRate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar tasa' }));
    await waitFor(() => expect(removeRate).toHaveBeenCalledWith('r1'));
  });
});
