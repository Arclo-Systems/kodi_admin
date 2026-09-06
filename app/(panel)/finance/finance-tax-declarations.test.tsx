import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  TaxDeclaration,
  TaxDeclarationDetail,
  TaxDeclarationPage,
} from '@/hooks/use-finance-tax';

let page: TaxDeclarationPage;
let detail: TaxDeclarationDetail;
const create = vi.fn();
const recalculate = vi.fn();
const transition = vi.fn();
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-tax', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-tax')>()),
  useTaxDeclarations: () => ({ data: page, isLoading: false, isError: false, refetch }),
  useTaxDeclaration: () => ({ data: detail, isLoading: false, isError: false, refetch }),
  useTaxDeclarationMutations: () => ({
    create: { mutateAsync: create },
    recalculate: { mutateAsync: recalculate, isPending: false },
    transition: { mutateAsync: transition },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { FinanceTaxDeclarations } from './finance-tax-declarations';

// El literal que manda el backend. El panel lo muestra tal cual: reescribirlo acá
// lo dejaría desfasado el día que el backend modele el IVA soportado.
const NOTA_IVA_SOPORTADO =
  'IVA soportado no modelado en esta versión; el contador lo agrega a mano';

const BASE: TaxDeclaration = {
  id: 'd1',
  year: 2026,
  month: 9,
  period: '2026-09',
  kind: 'IVA',
  status: 'DRAFT',
  currency: 'CRC',
  taxableBase: '150000.00',
  taxAmount: '19500.00',
  ivaRepercutido: '19500.00',
  taxDebits: '9000.00',
  ivaSoportado: null,
  ivaSoportadoNote: NOTA_IVA_SOPORTADO,
  calculatedAt: '2026-10-01T12:00:00.000Z',
  notes: null,
  filedAt: null,
  filedBy: null,
  createdBy: 'u1',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  stale: false,
  allowedTransitions: ['REVIEW'],
};

const DETAIL: TaxDeclarationDetail = {
  ...BASE,
  snapshot: {
    taxAccountCode: '2220',
    totals: {
      ivaRepercutido: '19500.00',
      taxDebits: '9000.00',
      ivaSoportado: null,
      note: NOTA_IVA_SOPORTADO,
    },
    lines: [
      {
        entryId: 'e1',
        entryNumber: '2026-000001',
        date: '2026-09-10',
        description: 'Factura FS-2026-0001',
        base: '100000.00',
        taxCredit: '13000.00',
        taxDebit: '0.00',
      },
    ],
    excludedCurrencies: [],
  },
};

function abrirDetalle(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
}

beforeEach(() => {
  page = { items: [BASE], total: 1, page: 1, pageSize: 20 };
  detail = DETAIL;
  vi.clearAllMocks();
  create.mockResolvedValue({});
  recalculate.mockResolvedValue({});
  transition.mockResolvedValue({});
});

describe('FinanceTaxDeclarations — la lista', () => {
  it('muestra el período, el estado y las cifras con su moneda', () => {
    render(<FinanceTaxDeclarations canWrite />);

    expect(screen.getByText('09/2026')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('150 000,00 CRC')).toBeInTheDocument();
    expect(screen.getByText('19 500,00 CRC')).toBeInTheDocument();
  });

  it('sin finance:write no ofrece crear, pero sí ver el detalle', () => {
    render(<FinanceTaxDeclarations />);

    expect(screen.queryByRole('button', { name: /Nueva declaración/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument();
  });
});

describe('FinanceTaxDeclarations — el detalle', () => {
  it('el IVA soportado dice N/A con el texto LITERAL del backend', () => {
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('IVA soportado (compras): N/A')).toBeInTheDocument();
    expect(screen.getByText(NOTA_IVA_SOPORTADO)).toBeInTheDocument();
  });

  it('separa el IVA repercutido de los débitos y aclara que NO se restan', () => {
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('IVA repercutido (cobrado)')).toBeInTheDocument();
    expect(screen.getByText(/Informativo: NO se restan/)).toBeInTheDocument();
    // El impuesto declarado es el bruto, no el neteado (19500, no 10500).
    expect(screen.getAllByText('19 500,00 CRC').length).toBeGreaterThan(0);
  });

  it('el snapshot lista el crédito y el débito de cada asiento por separado', () => {
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('2026-000001')).toBeInTheDocument();
    expect(screen.getByText('IVA cobrado')).toBeInTheDocument();
    expect(screen.getByText('IVA debitado')).toBeInTheDocument();
  });

  it('nombra las monedas excluidas en vez de convertirlas', () => {
    detail = {
      ...DETAIL,
      snapshot: {
        ...DETAIL.snapshot,
        excludedCurrencies: [{ currency: 'USD', taxAmount: '13.00' }],
      },
    };
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('Monedas excluidas')).toBeInTheDocument();
    expect(screen.getByText(/13,00 USD/)).toBeInTheDocument();
  });
});

describe('FinanceTaxDeclarations — los botones según el estado', () => {
  it('en DRAFT ofrece recalcular y pasar a revisión, y nada más', () => {
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByRole('button', { name: /Recalcular/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasar a revisión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar presentada' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Volver a borrador' })).toBeNull();
  });

  it('en REVIEW ofrece las dos salidas: adelante y la vuelta atrás', () => {
    detail = { ...DETAIL, status: 'REVIEW', allowedTransitions: ['DRAFT', 'FILED'] };
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByRole('button', { name: 'Volver a borrador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar presentada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recalcular/ })).toBeInTheDocument();
  });

  it('en FILED ya no se recalcula: solo queda cerrar', () => {
    detail = { ...DETAIL, status: 'FILED', allowedTransitions: ['CLOSED'] };
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.queryByRole('button', { name: /Recalcular/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar declaración' })).toBeInTheDocument();
  });

  it('CLOSED es solo lectura: ni recalcular ni ninguna transición', () => {
    detail = { ...DETAIL, status: 'CLOSED', allowedTransitions: [] };
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Recalcular/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar declaración' })).toBeNull();
    // Las cifras siguen a la vista: cerrada no es escondida.
    expect(screen.getByText('IVA repercutido (cobrado)')).toBeInTheDocument();
  });

  it('sin finance:write no ofrece ninguna acción del ciclo', () => {
    render(<FinanceTaxDeclarations />);
    abrirDetalle();

    expect(screen.queryByRole('button', { name: /Recalcular/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pasar a revisión' })).toBeNull();
  });

  it('la transición pide confirmación antes de mandarla', async () => {
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    fireEvent.click(screen.getByRole('button', { name: 'Pasar a revisión' }));
    const confirm = await screen.findByText(/Se sigue pudiendo recalcular/);
    expect(confirm).toBeInTheDocument();
    expect(transition).not.toHaveBeenCalled();

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    fireEvent.click(
      within(confirmDialog as HTMLElement).getByRole('button', { name: 'Pasar a revisión' }),
    );
    await waitFor(() => expect(transition).toHaveBeenCalledWith({ id: 'd1', to: 'REVIEW' }));
  });
});

describe('FinanceTaxDeclarations — declaración desactualizada', () => {
  it('la lista la marca: el estado solo dice "Presentada" en los dos casos', () => {
    page = { items: [{ ...BASE, status: 'FILED', stale: true }], total: 1, page: 1, pageSize: 20 };
    render(<FinanceTaxDeclarations canWrite />);

    expect(screen.getByText('Presentada')).toBeInTheDocument();
    expect(screen.getByText('Desactualizada')).toBeInTheDocument();
  });

  it('una al día no lleva la marca en la lista', () => {
    render(<FinanceTaxDeclarations canWrite />);

    expect(screen.queryByText('Desactualizada')).toBeNull();
  });

  it('con el período reabierto se advierte y NO se ofrece avanzar de estado', () => {
    detail = { ...DETAIL, status: 'FILED', stale: true, allowedTransitions: ['CLOSED'] };
    render(<FinanceTaxDeclarations canWrite />);
    abrirDetalle();

    expect(screen.getByText('Desactualizada')).toBeInTheDocument();
    expect(
      screen.getByText('El período se reabrió después de presentarla'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar declaración' })).toBeNull();
  });
});

describe('FinanceTaxDeclarations — el alta', () => {
  it('manda el mes elegido sin montos: las cifras salen del mayor', async () => {
    render(<FinanceTaxDeclarations canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Nueva declaración/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/no se teclean|se calculan del libro mayor/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear declaración/ }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    const payload = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ kind: 'IVA', currency: 'CRC' });
    expect(payload).not.toHaveProperty('taxAmount');
    expect(payload).not.toHaveProperty('taxableBase');
  });

  it('el 409 de mes ya declarado queda en el diálogo, con el mes elegido puesto', async () => {
    create.mockRejectedValue(new Error('Ya hay una declaración de IVA de 2026-09.'));
    render(<FinanceTaxDeclarations canWrite />);
    fireEvent.click(screen.getByRole('button', { name: /Nueva declaración/ }));

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Crear declaración/ }),
    );

    expect(await screen.findByText(/Ya hay una declaración de IVA de 2026-09/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
