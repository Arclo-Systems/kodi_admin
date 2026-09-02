import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceEntry } from '@/hooks/use-finance';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const remove = vi.fn();
let items: FinanceEntry[] = [];

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceEntries: () => ({
    data: { items, total: items.length, page: 1, pageSize: 20 },
    isLoading: false,
  }),
  useFinanceEntryMutations: () => ({ remove: { mutateAsync: remove } }),
}));

import { FinanceEntriesTable } from './finance-entries-table';

function entry(over: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 'e1',
    categoryId: 'cat-1',
    categoryName: 'Marketing & Publicidad',
    kind: 'expense',
    amount: 15000,
    currency: 'CRC',
    date: '2026-07-31T12:00:00.000Z',
    vendor: 'Paula Espinoza',
    note: 'Segundo pago a Pau',
    hasReceipt: false,
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    ...over,
  };
}

const fila = () => screen.getByText('Paula Espinoza').closest('tr') as HTMLTableRowElement;
const modal = () => screen.queryByRole('dialog');

beforeEach(() => {
  vi.clearAllMocks();
  items = [entry()];
});

describe('FinanceEntriesTable — el click en la fila abre el detalle, no la edición', () => {
  it('abre un modal con los datos del movimiento y no navega', async () => {
    render(<FinanceEntriesTable />);
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
    render(<FinanceEntriesTable />);
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
    render(<FinanceEntriesTable />);

    const editar = within(fila()).getByRole('link', { name: /Editar/ });
    expect(editar).toHaveAttribute('href', '/finance/movimientos/e1/edit');

    fireEvent.click(editar);
    expect(modal()).toBeNull();
  });

  it('el botón de borrar de la fila no abre el detalle', async () => {
    render(<FinanceEntriesTable />);

    fireEvent.click(within(fila()).getByRole('button', { name: /Borrar/ }));

    await waitFor(() => expect(screen.getByText('Borrar movimiento')).toBeInTheDocument());
    // El detalle no se coló: su botón de cerrar no existe en ninguna otra parte.
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('el detalle también se abre por teclado, desde el botón Ver de la fila', async () => {
    render(<FinanceEntriesTable />);

    const ver = within(fila()).getByRole('button', { name: /Ver/ });
    ver.focus();
    expect(ver).toHaveFocus();

    fireEvent.click(ver);

    await waitFor(() => expect(modal()).not.toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('el detalle cierra con Esc', async () => {
    render(<FinanceEntriesTable />);
    fireEvent.click(fila());
    await waitFor(() => expect(modal()).not.toBeNull());

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(modal()).toBeNull());
  });

  it('un movimiento sin proveedor ni nota no inventa datos', async () => {
    items = [entry({ vendor: null, note: null, categoryName: 'Otros' })];
    render(<FinanceEntriesTable />);

    fireEvent.click(screen.getByText('Otros').closest('tr') as HTMLTableRowElement);

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getByText('Movimiento')).toBeInTheDocument();
    expect(d.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});
