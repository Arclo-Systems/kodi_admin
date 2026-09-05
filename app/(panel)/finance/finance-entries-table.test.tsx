import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FinanceEntry } from '@/hooks/use-finance';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const voidEntry = vi.fn();
const entriesQuery = vi.fn();
let items: FinanceEntry[] = [];

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceEntries: (query: unknown) => {
    entriesQuery(query);
    return {
      data: { items, total: items.length, page: 1, pageSize: 20 },
      isLoading: false,
    };
  },
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
    voidedAt: null,
    voidedBy: null,
    voidedByName: null,
    voidReason: null,
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

  it('acota el motivo a 300 caracteres y muestra cuánto lleva', async () => {
    renderTable();
    fireEvent.click(within(fila()).getByRole('button', { name: /Anular/ }));
    await waitFor(() => expect(screen.getByText('Anular movimiento')).toBeInTheDocument());

    const motivo = screen.getByLabelText('Motivo');
    expect(motivo).toHaveAttribute('maxlength', '300');
    expect(screen.getByText('0/300')).toBeInTheDocument();

    fireEvent.change(motivo, { target: { value: 'Duplicado' } });
    expect(screen.getByText('9/300')).toBeInTheDocument();
  });

  it('el error del backend se ve en el diálogo, que queda abierto', async () => {
    voidEntry.mockRejectedValueOnce(new Error('El período contable está cerrado.'));
    renderTable();
    fireEvent.click(within(fila()).getByRole('button', { name: /Anular/ }));
    await waitFor(() => expect(screen.getByText('Anular movimiento')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Cargado dos veces' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }));

    expect(await screen.findByText('El período contable está cerrado.')).toBeInTheDocument();
    expect(screen.getByText('Anular movimiento')).toBeInTheDocument();
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

describe('FinanceEntriesTable — el detalle de un anulado explica la anulación', () => {
  it('muestra motivo, fecha y quién', async () => {
    items = [
      entry({
        status: 'VOIDED',
        voidedAt: '2026-09-05T15:30:00.000Z',
        voidedBy: 'admin-uuid-1',
        voidReason: 'Cargado dos veces por error',
      }),
    ];
    renderTable();

    fireEvent.click(fila());

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getByText('Cargado dos veces por error')).toBeInTheDocument();
    expect(d.getByText('5/9/2026')).toBeInTheDocument();
    expect(d.getByText('admin-uuid-1')).toBeInTheDocument();
  });

  it('un movimiento activo no muestra nada de anulación', async () => {
    renderTable();

    fireEvent.click(fila());

    await waitFor(() => expect(modal()).not.toBeNull());
    expect(within(modal() as HTMLElement).queryByText('Motivo de la anulación')).toBeNull();
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

describe('FinanceEntriesTable — los filtros de tipo y estado los resuelve el backend', () => {
  const lastQuery = () =>
    entriesQuery.mock.calls[entriesQuery.mock.calls.length - 1]?.[0] as Record<string, unknown>;

  async function filtrar(combobox: string, opcion: string): Promise<void> {
    fireEvent.click(screen.getByRole('combobox', { name: combobox }));
    fireEvent.click(await screen.findByRole('option', { name: opcion }));
  }

  it('manda `type` con el enum del backend, no el signo de la categoría', async () => {
    renderTable();

    await filtrar('Filtrar por tipo', 'Transferencia');

    await waitFor(() => expect(lastQuery()).toMatchObject({ type: 'TRANSFER', page: 1 }));
  });

  it('manda `status` para ver solo los anulados', async () => {
    renderTable();

    await filtrar('Filtrar por estado', 'Anulado');

    await waitFor(() => expect(lastQuery()).toMatchObject({ status: 'VOIDED', page: 1 }));
  });

  it('volver a "todos" saca el filtro en vez de mandar un valor vacío', async () => {
    renderTable();

    await filtrar('Filtrar por tipo', 'Gasto');
    await waitFor(() => expect(lastQuery().type).toBe('EXPENSE'));
    await filtrar('Filtrar por tipo', 'Todos los tipos');

    await waitFor(() => expect(lastQuery().type).toBeUndefined());
  });
});

describe('FinanceEntriesTable — "Anulado por" muestra a la persona', () => {
  it('usa el nombre del admin y guarda el uuid para cuando ya no existe', async () => {
    items = [
      entry({
        status: 'VOIDED',
        voidedAt: '2026-09-05T15:30:00.000Z',
        voidedBy: 'admin-uuid-1',
        voidedByName: 'Emilio Rodríguez',
        voidReason: 'Cargado dos veces por error',
      }),
    ];
    renderTable();

    fireEvent.click(fila());

    await waitFor(() => expect(modal()).not.toBeNull());
    const d = within(modal() as HTMLElement);
    expect(d.getByText('Emilio Rodríguez')).toBeInTheDocument();
    expect(d.queryByText('admin-uuid-1')).toBeNull();
  });
});
