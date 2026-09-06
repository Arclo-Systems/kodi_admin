import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TaxRule } from '@/hooks/use-finance-tax';

let rules: TaxRule[];
const create = vi.fn();
const update = vi.fn();
const deactivate = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-tax', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-tax')>()),
  useTaxRules: () => ({ data: rules, isLoading: false, isError: false, refetch }),
  useTaxRuleMutations: () => ({
    create: { mutateAsync: create },
    update: { mutateAsync: update },
    deactivate: { mutateAsync: deactivate },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { FinanceTaxRules } from './finance-tax-rules';

const IVA: TaxRule = {
  id: 'r1',
  code: 'IVA_CR',
  name: 'IVA Costa Rica 13 %',
  rate: '0.1300',
  appliesTo: 'SPONSOR_INVOICE',
  validFrom: '2019-07-01',
  validTo: null,
  isActive: true,
  createdBy: 'u1',
  updatedBy: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

beforeEach(() => {
  rules = [IVA];
  vi.clearAllMocks();
  create.mockResolvedValue({});
  update.mockResolvedValue({});
  deactivate.mockResolvedValue({});
});

describe('FinanceTaxRules — la tabla', () => {
  it('muestra la tarifa en por ciento y la fracción exacta al lado', () => {
    render(<FinanceTaxRules canWrite />);

    // El IVA se habla en por ciento; lo guardado es la fracción. Las dos cosas,
    // porque el 400 del backend habla de la fracción.
    expect(screen.getByText(/13,00 %/)).toBeInTheDocument();
    expect(screen.getByText('0.1300')).toBeInTheDocument();
    expect(screen.getByText('Facturas de sponsor')).toBeInTheDocument();
  });

  it('una vigencia sin fin se nombra, no se deja en blanco', () => {
    render(<FinanceTaxRules canWrite />);

    expect(screen.getByText('2019-07-01', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('sin fecha de fin')).toBeInTheDocument();
  });

  it('sin finance:write no ofrece crear, editar ni retirar', () => {
    render(<FinanceTaxRules />);

    expect(screen.queryByRole('button', { name: /Nueva tarifa/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Retirar/ })).toBeNull();
    // Ver sí: la tarifa vigente explica el monto de cualquier factura.
    expect(screen.getByText(/13,00 %/)).toBeInTheDocument();
  });
});

describe('FinanceTaxRules — el alta', () => {
  it('rechaza el porcentaje tecleado como entero antes de mandarlo', async () => {
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/ }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código'), { target: { value: 'IVA_CR' } });
    fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'IVA 13' } });
    // El dedazo más probable: 13 en vez de 0.13.
    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '13' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear tarifa/ }));

    expect(await screen.findByText(/una fracción entre 0 y 1/i)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('manda la tasa como string, tal cual se tecleó', async () => {
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/ }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código'), { target: { value: 'IVA_CR' } });
    fireEvent.change(within(dialog).getByLabelText('Nombre'), {
      target: { value: 'IVA Costa Rica 13 %' },
    });
    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '0.13' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear tarifa/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      code: 'IVA_CR',
      rate: '0.13',
      appliesTo: 'SPONSOR_INVOICE',
      validTo: null,
    });
  });

  it('el 409 de solapamiento se muestra en el formulario, que es donde se corrige', async () => {
    create.mockRejectedValue(
      new Error('La vigencia se pisa con IVA_CR (2019-07-01 → sin fin). Cerrala primero.'),
    );
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/ }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código'), { target: { value: 'IVA_CR' } });
    fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'IVA 14 %' } });
    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '0.14' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear tarifa/ }));

    expect(await screen.findByText(/La vigencia se pisa con IVA_CR/)).toBeInTheDocument();
    // El diálogo NO se cierra: lo tecleado sigue ahí para corregir la fecha.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('FinanceTaxRules — la edición', () => {
  it('no ofrece cambiar el código ni el ámbito, y no los manda', async () => {
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Código')).toBeNull();
    expect(within(dialog).queryByLabelText('Aplica a')).toBeNull();

    fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'IVA 13 %' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar cambios/ }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const payload = update.mock.calls[0]?.[0] as { input: Record<string, unknown> };
    expect(payload.input).not.toHaveProperty('code');
    expect(payload.input).not.toHaveProperty('appliesTo');
  });

  it('el 409 de tarifa ya usada se muestra tal cual llega del backend', async () => {
    update.mockRejectedValue(
      new Error('La tarifa ya se usó en facturas emitidas: retirala y creá una nueva.'),
    );
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tasa'), { target: { value: '0.14' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar cambios/ }));

    expect(await screen.findByText(/ya se usó en facturas emitidas/)).toBeInTheDocument();
  });
});

describe('FinanceTaxRules — retirar', () => {
  it('pide confirmación y avisa qué pasa si no queda ninguna vigente', async () => {
    render(<FinanceTaxRules canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Retirar/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/No se borra/)).toBeInTheDocument();
    expect(within(dialog).getByText(/va a responder 409/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Retirar tarifa' }));
    await waitFor(() => expect(deactivate).toHaveBeenCalledWith('r1'));
  });

  it('una tarifa ya retirada no vuelve a ofrecer el botón', () => {
    rules = [{ ...IVA, isActive: false }];
    render(<FinanceTaxRules canWrite />);

    expect(screen.getByText('Retirada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Retirar$/ })).toBeNull();
  });
});
