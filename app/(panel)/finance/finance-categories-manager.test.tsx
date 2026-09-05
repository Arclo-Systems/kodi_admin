import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceAccount, FinanceCategory } from '@/hooks/use-finance';

const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
let categories: FinanceCategory[] = [];

function account(over: Partial<FinanceAccount> = {}): FinanceAccount {
  return {
    id: 'acc-1',
    code: '6110',
    name: 'Sueldos',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: null,
    isActive: true,
    allowsManualEntry: true,
    ...over,
  };
}

const SUELDOS = account();
const INFRA = account({ id: 'acc-2', code: '5110', name: 'Infraestructura', type: 'COST_OF_REVENUE' });
const SUSCRIPCIONES = account({
  id: 'acc-3',
  code: '4110',
  name: 'Ingresos por suscripciones',
  type: 'INCOME',
});
const RETIRADA = account({
  id: 'acc-4',
  code: '6199',
  name: 'Gasto discontinuado',
  type: 'OPERATING_EXPENSE',
  isActive: false,
});

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceCategories: () => ({ data: categories, isLoading: false }),
  useFinanceAccounts: () => ({ data: [SUELDOS, INFRA, SUSCRIPCIONES, RETIRADA] }),
  useFinanceCategoryMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
    remove: { mutateAsync: remove },
  }),
}));

import { FinanceCategoriesManager } from './finance-categories-manager';

function category(over: Partial<FinanceCategory> = {}): FinanceCategory {
  return {
    id: 'cat-1',
    name: 'Salarios',
    kind: 'expense',
    sortOrder: 1,
    isActive: true,
    accountId: SUELDOS.id,
    ...over,
  };
}

const accountSelect = () => screen.getByRole('combobox', { name: 'Cuenta contable' });
const options = async (): Promise<string[]> => {
  fireEvent.click(accountSelect());
  const list = await screen.findAllByRole('option');
  return list.map((o) => o.textContent ?? '');
};

beforeEach(() => {
  vi.clearAllMocks();
  categories = [category()];
  create.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
});

describe('FinanceCategoriesManager — las cuentas se filtran por tipo de categoría', () => {
  it('un gasto solo ofrece cuentas de gasto operativo y costo de ingresos', async () => {
    render(<FinanceCategoriesManager />);

    expect(await options()).toEqual([
      'Sin cuenta',
      `${SUELDOS.code} ${SUELDOS.name}`,
      `${INFRA.code} ${INFRA.name}`,
    ]);
  });

  it('un ingreso solo ofrece cuentas de ingreso', async () => {
    render(<FinanceCategoriesManager />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Tipo' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Ingreso' }));

    expect(await options()).toEqual([
      'Sin cuenta',
      `${SUSCRIPCIONES.code} ${SUSCRIPCIONES.name}`,
    ]);
  });

  it('no ofrece una cuenta retirada: el backend la rechazaría', async () => {
    render(<FinanceCategoriesManager />);

    expect(await options()).not.toContain(`${RETIRADA.code} ${RETIRADA.name}`);
  });
});

describe('FinanceCategoriesManager — la cuenta viaja en el PATCH', () => {
  it('guarda la cuenta elegida al editar', async () => {
    render(<FinanceCategoriesManager />);

    fireEvent.click(screen.getAllByRole('button', { name: /Editar/ })[0]!);
    fireEvent.click(accountSelect());
    fireEvent.click(await screen.findByRole('option', { name: `${INFRA.code} ${INFRA.name}` }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const [{ input }] = update.mock.calls[0] as [{ input: { accountId: string | null } }];
    expect(input.accountId).toBe(INFRA.id);
  });

  it('desmapea con null explícito', async () => {
    render(<FinanceCategoriesManager />);

    fireEvent.click(screen.getAllByRole('button', { name: /Editar/ })[0]!);
    fireEvent.click(accountSelect());
    fireEvent.click(await screen.findByRole('option', { name: 'Sin cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const [{ input }] = update.mock.calls[0] as [{ input: { accountId: string | null } }];
    expect(input.accountId).toBeNull();
  });

  it('el alta lleva la cuenta', async () => {
    render(<FinanceCategoriesManager />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Hosting' } });
    fireEvent.click(accountSelect());
    fireEvent.click(await screen.findByRole('option', { name: `${INFRA.code} ${INFRA.name}` }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const [input] = create.mock.calls[0] as [{ name: string; accountId: string | null }];
    expect(input).toMatchObject({ name: 'Hosting', accountId: INFRA.id });
  });
});

describe('FinanceCategoriesManager — una categoría huérfana se ve en la tabla', () => {
  it('avisa que sus movimientos no se pueden contabilizar', () => {
    categories = [category({ accountId: null })];
    render(<FinanceCategoriesManager />);

    const fila = screen.getByText('Salarios').closest('tr') as HTMLTableRowElement;
    expect(
      within(fila).getByText(
        'Sin cuenta: los movimientos de esta categoría no se pueden contabilizar',
      ),
    ).toBeInTheDocument();
  });

  it('la categoría mapeada muestra su cuenta', () => {
    render(<FinanceCategoriesManager />);

    const fila = screen.getByText('Salarios').closest('tr') as HTMLTableRowElement;
    expect(within(fila).getByText(`${SUELDOS.code} ${SUELDOS.name}`)).toBeInTheDocument();
  });
});
