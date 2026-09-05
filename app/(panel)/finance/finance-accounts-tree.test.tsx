import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccountBalances, FinanceAccount } from '@/hooks/use-finance';

const create = vi.fn();
const update = vi.fn();
let accounts: FinanceAccount[] = [];
let balances: AccountBalances | undefined;

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  useFinanceAccounts: () => ({
    data: accounts,
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  }),
  useFinanceAccountBalances: () => ({ data: balances, isLoading: false, isError: false }),
  useFinanceAccountMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
  }),
}));

import { FinanceAccountsTree } from './finance-accounts-tree';

function account(over: Partial<FinanceAccount> = {}): FinanceAccount {
  return {
    id: 'acc-6000',
    code: '6000',
    name: 'Gastos operativos',
    type: 'OPERATING_EXPENSE',
    currency: null,
    parentId: null,
    isActive: true,
    allowsManualEntry: false,
    sortOrder: 0,
    parentCode: null,
    depth: 0,
    ...over,
  };
}

const PADRE = account();
const HIJA = account({
  id: 'acc-6900',
  code: '6900',
  name: 'Otros gastos operativos',
  parentId: PADRE.id,
  parentCode: PADRE.code,
  depth: 1,
  allowsManualEntry: true,
});

const dialog = () => screen.getByRole('dialog');

async function abrirAlta(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
}

beforeEach(() => {
  vi.clearAllMocks();
  accounts = [PADRE, HIJA];
  balances = {
    currency: 'CRC',
    asOf: '2026-10-02T05:59:59.999Z',
    accounts: [
      {
        accountId: HIJA.id,
        code: HIJA.code,
        name: HIJA.name,
        type: HIJA.type,
        isActive: true,
        balance: '1400.00',
      },
    ],
  };
  create.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
});

describe('FinanceAccountsTree — el plan se lee como un árbol con saldo', () => {
  it('muestra cada cuenta con su clase, su moneda y el saldo del reporte', () => {
    render(<FinanceAccountsTree canWrite />);

    const fila = screen.getByText('Otros gastos operativos').closest('tr') as HTMLTableRowElement;
    expect(fila).toHaveTextContent('6900');
    expect(fila).toHaveTextContent('Gasto operativo');
    expect(fila).toHaveTextContent('1 400,00');
    // Sin fila en el reporte de saldos no se inventa un cero.
    const padre = screen.getByText('Gastos operativos').closest('tr') as HTMLTableRowElement;
    expect(padre).toHaveTextContent('—');
  });

  it('sin permiso de escritura no ofrece alta ni edición', () => {
    render(<FinanceAccountsTree />);

    expect(screen.queryByRole('button', { name: 'Nueva cuenta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });
});

describe('FinanceAccountsTree — alta de una cuenta hija', () => {
  it('rechaza un código que no son 4 dígitos antes de mandarlo', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '69' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), { target: { value: 'Legales' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El código son 4 dígitos')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('exige que el código empiece por el dígito de la clase heredada', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '1901' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), { target: { value: 'Legales' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/empieza con 6/)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('manda el alta con el padre elegido y la clase la hereda el backend', async () => {
    render(<FinanceAccountsTree canWrite />);
    await abrirAlta();

    fireEvent.click(within(dialog()).getByRole('combobox', { name: /Cuenta padre/ }));
    fireEvent.click(await screen.findByRole('option', { name: '6000 Gastos operativos' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: '6901' } });
    fireEvent.change(within(dialog()).getByLabelText('Nombre'), {
      target: { value: 'Gastos legales' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      code: '6901',
      name: 'Gastos legales',
      parentId: PADRE.id,
      currency: null,
      allowsManualEntry: true,
    });
  });
});

describe('FinanceAccountsTree — edición', () => {
  it('no deja tocar el código: es la llave con la que la cuenta ya figura en papeles', async () => {
    render(<FinanceAccountsTree canWrite />);
    const fila = screen.getByText('Otros gastos operativos').closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(fila).getByRole('button', { name: 'Editar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
    expect(within(dialog()).getByLabelText('Código')).toBeDisabled();
    expect(within(dialog()).queryByRole('combobox', { name: /Cuenta padre/ })).toBeNull();
  });

  it('retira la cuenta con el switch en vez de borrarla', async () => {
    render(<FinanceAccountsTree canWrite />);
    const fila = screen.getByText('Otros gastos operativos').closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(fila).getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());

    fireEvent.click(within(dialog()).getByRole('switch', { name: 'Activa' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      id: HIJA.id,
      input: {
        name: HIJA.name,
        currency: null,
        isActive: false,
        allowsManualEntry: true,
      },
    });
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull();
  });
});
