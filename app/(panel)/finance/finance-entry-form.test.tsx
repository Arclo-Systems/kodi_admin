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

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceCategories: () => ({ data: [CATEGORY] }),
  useFinanceEntry: () => ({ data: detail, isLoading: false }),
  useFinanceEntryMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
  }),
}));

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

const savedDate = async (): Promise<string> => {
  await waitFor(() => expect(update).toHaveBeenCalled());
  const [{ input }] = update.mock.calls[0] as [{ input: { date: string } }];
  return input.date;
};

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

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('reancla un movimiento viejo guardado a medianoche UTC sin cambiarle el día', async () => {
    // Es lo que pasa al reabrir y volver a guardar los movimientos cargados antes del fix:
    // el formulario los precarga en su día civil y los devuelve anclados a mediodía.
    detail = entry({ date: '2026-07-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('no corre el año al guardar un 31 de diciembre', async () => {
    detail = entry({ date: '2026-12-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await savedDate()).toBe('2026-12-31T12:00:00.000Z');
  });
});
