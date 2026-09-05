import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FinanceEntry } from '@/hooks/use-finance';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const voidEntry = vi.fn();
let items: FinanceEntry[] = [];

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceEntries: () => ({
    data: { items, total: items.length, page: 1, pageSize: 20 },
    isLoading: false,
  }),
  useVoidFinanceEntry: () => ({ mutateAsync: voidEntry }),
}));

import { FinanceEntriesTable } from './finance-entries-table';

function entry(over: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 'e1',
    categoryId: 'cat-1',
    categoryName: 'Marketing & Publicidad',
    kind: 'expense',
    type: 'EXPENSE',
    status: 'ACTIVE',
    amount: '15000.00',
    currency: 'CRC',
    date: '2026-07-31T12:00:00.000Z',
    accountId: null,
    counterAccountId: null,
    journalEntryId: 'je-1',
    vendor: 'Paula Espinoza',
    note: 'Segundo pago a Pau',
    hasReceipt: false,
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    ...over,
  };
}

const renderTable = () =>
  render(
    <TooltipProvider>
      <FinanceEntriesTable />
    </TooltipProvider>,
  );

const fila = () => screen.getByText('Paula Espinoza').closest('tr') as HTMLTableRowElement;
const modal = () => screen.queryByRole('dialog');

beforeEach(() => {
  vi.clearAllMocks();
  items = [entry()];
  voidEntry.mockResolvedValue(undefined);
});

describe('FinanceEntriesTable — el click en la fila abre el detalle, no la edición', () => {
  it('abre un modal con los datos del movimiento y no navega', async () => {
    renderTable();
    expect(modal()).toBeNull();

    fireEvent.click(fila());

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getAllByText('Paula Espinoza').length).toBeGreaterThan(0);
    expect(d.getAllByText('Marketing & Publicidad').length).toBeGreaterThan(0);
    expect(d.getByText('15 000,00 CRC')).toBeInTheDocument();
    expect(d.getAllByText('31/7/2026').length).toBeGreaterThan(0);
    expect(d.getByText('Segundo pago a Pau')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('el modal ofrece salir a la edición, sin editar nada adentro', async () => {
    renderTable();
    fireEvent.click(fila());

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getByRole('link', { name: /Editar/ })).toHaveAttribute(
      'href',
      '/finance/movimientos/e1/edit',
    );
    expect(d.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(d.queryByRole('textbox')).toBeNull();
  });

  it('el botón de editar de la fila lleva a la edición y no abre el modal', () => {
    renderTable();

    const editar = within(fila()).getByRole('link', { name: /Editar/ });
    expect(editar).toHaveAttribute('href', '/finance/movimientos/e1/edit');

    fireEvent.click(editar);
    expect(modal()).toBeNull();
  });

  it('el botón de anular de la fila no abre el detalle', async () => {
    renderTable();

    fireEvent.click(within(fila()).getByRole('button', { name: /Anular/ }));

    await waitFor(() => expect(screen.getByText('Anular movimiento')).toBeInTheDocument());
    // El detalle no se coló: su botón de cerrar no existe en ninguna otra parte.
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('el detalle también se abre por teclado, desde el botón Ver de la fila', async () => {
    renderTable();

    const ver = within(fila()).getByRole('button', { name: /Ver/ });
    ver.focus();
    expect(ver).toHaveFocus();

    fireEvent.click(ver);

    await waitFor(() => expect(modal()).not.toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('el detalle cierra con Esc', async () => {
    renderTable();
    fireEvent.click(fila());
    await waitFor(() => expect(modal()).not.toBeNull());

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(modal()).toBeNull());
  });

  it('un movimiento sin proveedor ni nota no inventa datos', async () => {
    items = [entry({ vendor: null, note: null, categoryName: 'Otros' })];
    renderTable();

    fireEvent.click(screen.getByText('Otros').closest('tr') as HTMLTableRowElement);

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getByText('Movimiento')).toBeInTheDocument();
    expect(d.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});

describe('FinanceEntriesTable — anular reemplaza al borrado', () => {
  it('no ofrece borrar en ninguna fila', () => {
    renderTable();
    expect(within(fila()).queryByRole('button', { name: /Borrar/ })).toBeNull();
  });

  it('exige un motivo de al menos 5 caracteres antes de confirmar', async () => {
    renderTable();
    fireEvent.click(within(fila()).getByRole('button', { name: /Anular/ }));
    await waitFor(() => expect(screen.getByText('Anular movimiento')).toBeInTheDocument());

    const confirmar = screen.getByRole('button', { name: 'Anular' });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'dup' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Cargado dos veces' } });
    expect(confirmar).toBeEnabled();

    fireEvent.click(confirmar);
    await waitFor(() =>
      expect(voidEntry).toHaveBeenCalledWith({ id: 'e1', reason: 'Cargado dos veces' }),
    );
  });

  it('un movimiento anulado no se puede volver a anular', () => {
    items = [entry({ status: 'VOIDED' })];
    renderTable();

    expect(within(fila()).queryByRole('button', { name: /Anular/ })).toBeNull();
    expect(within(fila()).getByText('Anulado')).toBeInTheDocument();
  });

  it('un movimiento sin asiento no se puede anular todavía', async () => {
    items = [entry({ journalEntryId: null })];
    renderTable();

    expect(within(fila()).getByRole('button', { name: /Anular/ })).toBeDisabled();
    fireEvent.focus(within(fila()).getByRole('button', { name: /Anular/ }).parentElement!);
    await waitFor(() =>
      expect(screen.getAllByText('Pendiente de contabilizar').length).toBeGreaterThan(0),
    );
  });
});

describe('FinanceEntriesTable — el tipo de movimiento sale del backend', () => {
  it('pinta el tipo contable, no el signo de la categoría', () => {
    items = [entry({ type: 'TRANSFER', kind: 'expense' })];
    renderTable();

    expect(within(fila()).getByText('Transferencia')).toBeInTheDocument();
    expect(within(fila()).getByText('Activo')).toBeInTheDocument();
  });
});
