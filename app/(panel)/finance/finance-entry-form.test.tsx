import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceCategory, FinanceEntry } from '@/hooks/use-finance';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const create = vi.fn();
const update = vi.fn();
let detail: FinanceEntry | undefined;

const CATEGORY: FinanceCategory = {
  id: 'cat-1',
  name: 'Salarios',
  kind: 'expense',
  sortOrder: 1,
  isActive: true,
};

const OTHER_CATEGORY: FinanceCategory = {
  id: 'cat-2',
  name: 'Publicidad',
  kind: 'expense',
  sortOrder: 2,
  isActive: true,
};

// Las categorías llegan por su propia query, SIEMPRE después del primer render del form
// (el form recién se monta cuando el movimiento ya cargó). El mock replica ese desfase.
vi.mock('@/hooks/use-finance', async (importOriginal) => {
  const { useEffect, useState } = await import('react');
  return {
    ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
    useFinanceCategories: () => {
      const [data, setData] = useState<FinanceCategory[] | undefined>(undefined);
      useEffect(() => setData([CATEGORY, OTHER_CATEGORY]), []);
      return { data };
    },
    useFinanceEntry: () => ({ data: detail, isLoading: false }),
    useFinanceEntryMutations: () => ({
      create: { mutateAsync: create },
      update: { mutateAsync: update },
    }),
  };
});

import { FinanceEntryForm } from './finance-entry-form';

function entry(over: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 'e1',
    categoryId: CATEGORY.id,
    categoryName: CATEGORY.name,
    kind: 'expense',
    amount: 15000,
    currency: 'CRC',
    date: '2026-07-31T12:00:00.000Z',
    vendor: 'Paula Espinoza',
    note: null,
    hasReceipt: false,
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    ...over,
  };
}

// El botón nace deshabilitado hasta que la categoría guardada queda seleccionada.
const enabledSaveButton = async (): Promise<HTMLElement> => {
  const button = screen.getByRole('button', { name: 'Guardar cambios' });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
};

const savedInput = async (): Promise<{ date: string; categoryId: string }> => {
  await waitFor(() => expect(update).toHaveBeenCalled());
  const [{ input }] = update.mock.calls[0] as [
    { input: { date: string; categoryId: string } },
  ];
  return input;
};

const savedDate = async (): Promise<string> => (await savedInput()).date;

beforeEach(() => {
  vi.clearAllMocks();
  detail = undefined;
  create.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
});

describe('FinanceEntryForm — la fecha es un día civil', () => {
  it('guarda el día anclado a mediodía UTC para que la tabla no lo corra', async () => {
    detail = entry({ date: '2026-07-31T12:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(await enabledSaveButton());

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('reancla un movimiento viejo guardado a medianoche UTC sin cambiarle el día', async () => {
    // Es lo que pasa al reabrir y volver a guardar los movimientos cargados antes del fix:
    // el formulario los precarga en su día civil y los devuelve anclados a mediodía.
    detail = entry({ date: '2026-07-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(await enabledSaveButton());

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('no corre el año al guardar un 31 de diciembre', async () => {
    detail = entry({ date: '2026-12-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(await enabledSaveButton());

    expect(await savedDate()).toBe('2026-12-31T12:00:00.000Z');
  });
});

describe('FinanceEntryForm — edición: la categoría guardada viene puesta', () => {
  it('muestra la categoría del movimiento en vez del placeholder', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    const categoria = await screen.findByRole('combobox', { name: 'Categoría' });
    await waitFor(() => expect(categoria).toHaveTextContent('Salarios'));
    expect(categoria).not.toHaveTextContent('Elegí una categoría');
  });

  it('permite guardar sin tocar el select', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(await enabledSaveButton());

    expect((await savedInput()).categoryId).toBe(CATEGORY.id);
  });

  it('sigue guardando el cambio real de categoría', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);
    await enabledSaveButton();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Categoría' }));
    fireEvent.click(await screen.findByRole('option', { name: OTHER_CATEGORY.name }));
    fireEvent.click(await enabledSaveButton());

    expect((await savedInput()).categoryId).toBe(OTHER_CATEGORY.id);
  });
});
