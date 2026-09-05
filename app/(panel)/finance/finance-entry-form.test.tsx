import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FinanceAccount, FinanceCategory, FinanceEntry } from '@/hooks/use-finance';

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
  accountId: 'acc-exp',
};

const OTHER_CATEGORY: FinanceCategory = {
  id: 'cat-2',
  name: 'Publicidad',
  kind: 'expense',
  sortOrder: 2,
  isActive: true,
  accountId: 'acc-exp',
};

function account(over: Partial<FinanceAccount> = {}): FinanceAccount {
  return {
    id: 'acc-caja',
    code: '1101',
    name: 'Caja colones',
    type: 'ASSET',
    currency: 'CRC',
    parentId: null,
    isActive: true,
    allowsManualEntry: true,
    ...over,
  };
}

const CAJA = account();
const BANCO = account({ id: 'acc-banco', code: '1201', name: 'Banco BAC colones' });
const CAJA_USD = account({
  id: 'acc-usd',
  code: '1102',
  name: 'Caja dólares',
  currency: 'USD',
});
const PROVEEDORES = account({
  id: 'acc-prov',
  code: '2110',
  name: 'Cuentas por pagar',
  type: 'LIABILITY',
  currency: null, // acepta cualquier moneda
});

const refetch = vi.fn();
let accountsState = { data: true, isLoading: false, isError: false };

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
    useFinanceAccounts: ({ type }: { postable?: boolean; type?: string } = {}) => ({
      data: accountsState.data
        ? type === 'ASSET'
          ? [CAJA, BANCO, CAJA_USD]
          : [CAJA, BANCO, CAJA_USD, PROVEEDORES]
        : undefined,
      isLoading: accountsState.isLoading,
      isError: accountsState.isError,
      refetch,
    }),
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
    type: 'EXPENSE',
    status: 'ACTIVE',
    amount: '15000.00',
    currency: 'CRC',
    date: '2026-07-31T12:00:00.000Z',
    accountId: null,
    counterAccountId: null,
    journalEntryId: null,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    vendor: 'Paula Espinoza',
    note: null,
    hasReceipt: false,
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    ...over,
  };
}

const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' });

const savedInput = async (): Promise<{ date: string; categoryId: string }> => {
  await waitFor(() => expect(update).toHaveBeenCalled());
  const [{ input }] = update.mock.calls[0] as [
    { input: { date: string; categoryId: string } },
  ];
  return input;
};

const savedDate = async (): Promise<string> => (await savedInput()).date;

async function pickOption(comboboxName: string | RegExp, optionName: string): Promise<void> {
  fireEvent.click(await screen.findByRole('combobox', { name: comboboxName }));
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

beforeEach(() => {
  vi.clearAllMocks();
  detail = undefined;
  accountsState = { data: true, isLoading: false, isError: false };
  create.mockResolvedValue(undefined);
  update.mockResolvedValue(undefined);
});

describe('FinanceEntryForm — la fecha es un día civil', () => {
  it('guarda el día anclado a mediodía UTC para que la tabla no lo corra', async () => {
    detail = entry({ date: '2026-07-31T12:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(saveButton());

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('reancla un movimiento viejo guardado a medianoche UTC sin cambiarle el día', async () => {
    // Es lo que pasa al reabrir y volver a guardar los movimientos cargados antes del fix:
    // el formulario los precarga en su día civil y los devuelve anclados a mediodía.
    detail = entry({ date: '2026-07-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(saveButton());

    expect(await savedDate()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('no corre el año al guardar un 31 de diciembre', async () => {
    detail = entry({ date: '2026-12-31T00:00:00.000Z' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.click(saveButton());

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

    fireEvent.click(saveButton());

    expect((await savedInput()).categoryId).toBe(CATEGORY.id);
  });

  it('sigue guardando el cambio real de categoría', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    await pickOption('Categoría', OTHER_CATEGORY.name);
    fireEvent.click(saveButton());

    expect((await savedInput()).categoryId).toBe(OTHER_CATEGORY.id);
  });
});

describe('FinanceEntryForm — el monto es texto, no un double', () => {
  it('rechaza tres decimales antes de llegar al backend', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '10.005' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Hasta 2 decimales')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza la notación científica', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1e3' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Hasta 2 decimales')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza el cero', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '0' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Mayor a 0')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('manda el monto como string, sin pasarlo por Number', async () => {
    detail = entry();
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1250.50' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(update).toHaveBeenCalled());
    const [{ input }] = update.mock.calls[0] as [{ input: { amount: string } }];
    expect(input.amount).toBe('1250.50');
  });
});

describe('FinanceEntryForm — una transferencia necesita sus dos cuentas', () => {
  it('no deja guardar sin cuenta de origen ni de destino', async () => {
    render(<FinanceEntryForm />);

    await pickOption('Tipo', 'Transferencia');
    await pickOption('Moneda', 'CRC');
    await pickOption('Categoría', CATEGORY.name);
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear movimiento' }));

    expect(await screen.findByText('Elegí la cuenta de origen')).toBeInTheDocument();
    expect(screen.getByText('Elegí la cuenta de destino')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('guarda las dos cuentas cuando están elegidas', async () => {
    render(<FinanceEntryForm />);

    await pickOption('Tipo', 'Transferencia');
    await pickOption('Moneda', 'CRC');
    await pickOption('Categoría', CATEGORY.name);
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5000' } });
    await pickOption('Cuenta de origen', `${CAJA.code} ${CAJA.name}`);
    await pickOption('Cuenta de destino', `${BANCO.code} ${BANCO.name}`);
    fireEvent.click(screen.getByRole('button', { name: 'Crear movimiento' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const [input] = create.mock.calls[0] as [
      { type: string; accountId: string | null; counterAccountId: string | null },
    ];
    expect(input.type).toBe('TRANSFER');
    expect(input.accountId).toBe(CAJA.id);
    expect(input.counterAccountId).toBe(BANCO.id);
  });

  it('la cuenta de origen no aparece en un gasto: la aporta la categoría', async () => {
    render(<FinanceEntryForm />);

    expect(screen.queryByRole('combobox', { name: 'Cuenta de origen' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Contrapartida' })).toBeInTheDocument();
  });
});

describe('FinanceEntryForm — origen y destino no pueden ser la misma cuenta', () => {
  it('lo dice en cliente, sin esperar el 409 del backend', async () => {
    render(<FinanceEntryForm />);

    await pickOption('Tipo', 'Transferencia');
    await pickOption('Moneda', 'CRC');
    await pickOption('Categoría', CATEGORY.name);
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5000' } });
    await pickOption('Cuenta de origen', `${CAJA.code} ${CAJA.name}`);
    await pickOption('Cuenta de destino', `${CAJA.code} ${CAJA.name}`);
    fireEvent.click(screen.getByRole('button', { name: 'Crear movimiento' }));

    expect(
      await screen.findByText('La cuenta de destino debe ser distinta de la de origen'),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('FinanceEntryForm — las cuentas se filtran por moneda', () => {
  it('con USD no ofrece una cuenta en colones', async () => {
    render(<FinanceEntryForm />);

    await pickOption('Moneda', 'USD');
    fireEvent.click(await screen.findByRole('combobox', { name: 'Contrapartida' }));

    expect(await screen.findByRole('option', { name: /1102 Caja dólares/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /1101 Caja colones/ })).toBeNull();
    // La cuenta sin moneda sirve para cualquiera.
    expect(screen.getByRole('option', { name: /2110 Cuentas por pagar/ })).toBeInTheDocument();
  });

  it('limpia la cuenta elegida si la moneda deja de servirle', async () => {
    render(<FinanceEntryForm />);

    // Arranca en USD (default del alta): se elige colones cambiando la moneda primero.
    await pickOption('Moneda', 'CRC');
    await pickOption('Contrapartida', `${CAJA.code} ${CAJA.name}`);
    expect(await screen.findByRole('combobox', { name: 'Contrapartida' })).toHaveTextContent(
      'Caja colones',
    );

    await pickOption('Moneda', 'USD');

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Contrapartida' })).not.toHaveTextContent(
        'Caja colones',
      ),
    );
  });
});

describe('FinanceEntryForm — el plan de cuentas puede tardar o fallar', () => {
  it('mientras carga, los selectores de cuenta quedan deshabilitados', async () => {
    accountsState = { data: false, isLoading: true, isError: false };
    render(<FinanceEntryForm />);

    const contrapartida = await screen.findByRole('combobox', { name: 'Contrapartida' });
    expect(contrapartida).toBeDisabled();
    expect(contrapartida).toHaveTextContent('Cargando cuentas…');
  });

  it('si falla, avisa y ofrece reintentar', async () => {
    accountsState = { data: false, isLoading: false, isError: true };
    render(<FinanceEntryForm />);

    expect(await screen.findByText('No se pudo cargar el plan de cuentas.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Contrapartida' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin cuentas para el tipo elegido no abre un popover vacío', async () => {
    render(<FinanceEntryForm />);

    // Aporte de socio exige contrapartida de activo; con USD solo queda la caja
    // en dólares y la cuenta sin moneda (que es de pasivo, no sirve acá).
    await pickOption('Tipo', 'Aporte de socio');
    await pickOption('Moneda', 'USD');
    fireEvent.click(await screen.findByRole('combobox', { name: 'Contrapartida' }));

    expect(await screen.findByRole('option', { name: /1102 Caja dólares/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /2110/ })).toBeNull();
  });
});

describe('FinanceEntryForm — un movimiento contabilizado no cambia de importe', () => {
  it('deshabilita monto, moneda, fecha, tipo, categoría y cuentas', async () => {
    detail = entry({ journalEntryId: 'je-1' });
    render(<FinanceEntryForm entryId="e1" />);

    expect(screen.getByLabelText('Monto')).toBeDisabled();
    expect(await screen.findByRole('combobox', { name: 'Moneda' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Contrapartida' })).toBeDisabled();
    expect(
      screen.getByText('Contabilizado: para corregir el monto, anulalo y cargalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('solo manda lo descriptivo: reenviar la fecha reanclada daría 409', async () => {
    detail = entry({ journalEntryId: 'je-1' });
    render(<FinanceEntryForm entryId="e1" />);

    fireEvent.change(screen.getByLabelText('Proveedor / fuente'), {
      target: { value: 'Railway' },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(update).toHaveBeenCalled());
    const [{ input }] = update.mock.calls[0] as [{ input: Record<string, unknown> }];
    expect(input).toEqual({ vendor: 'Railway', note: null, receiptKey: null });
  });
});

describe('FinanceEntryForm — un movimiento anulado es de solo lectura', () => {
  it('no ofrece guardar y avisa que hay que registrar uno nuevo', async () => {
    detail = entry({ status: 'VOIDED', journalEntryId: 'je-1' });
    render(<FinanceEntryForm entryId="e1" />);

    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(
      screen.getByText(
        'Movimiento anulado: no se edita. Registrá uno nuevo con los datos correctos.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedor / fuente')).toBeDisabled();
  });
});
