import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PlayOrder, PlayOrderStatus } from '@/hooks/use-finance';

let items: PlayOrder[] = [];
let listError = false;
const retry = vi.fn();
const counts: Record<string, number | undefined> = {};
let countsError = false;
const refetchCounts = vi.fn();

vi.mock('@/hooks/use-finance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance')>()),
  usePlayOrders: () => ({
    data: listError ? undefined : { items, total: items.length, page: 1, pageSize: 20 },
    isLoading: false,
    isError: listError,
    error: listError ? new Error('Se cayó la lista') : null,
    refetch: vi.fn(),
  }),
  usePlayOrderCounts: () => ({
    isLoading: false,
    isError: countsError,
    refetch: refetchCounts,
    counts,
    needsAttention: undefined,
  }),
  useRetryPlayOrder: () => ({ mutateAsync: retry, isPending: false }),
}));

import { FinancePlayOrders } from './finance-play-orders';

// El provider de tooltips lo pone el layout raíz del panel.
const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

function order(over: Partial<PlayOrder> = {}): PlayOrder {
  return {
    orderId: 'GPA.3311-1234-5678-90000',
    subscriptionId: 'kodi.plus.p3',
    userId: '0b0e0000-0000-4000-8000-000000000000',
    state: 'PROCESSED',
    createTime: '2026-09-02T10:00:00.000Z',
    totalAmount: '12.99',
    totalCurrency: 'USD',
    taxAmount: '1.69',
    taxCurrency: 'USD',
    developerRevenue: '9.61',
    developerRevenueCurrency: 'USD',
    commission: '1.69',
    postingStatus: 'POSTED',
    postingError: null,
    refundRequestedAt: null,
    journalEntryId: '7f3c0000-0000-4000-8000-000000000000',
    journalEntryNumber: '2026-000001',
    ...over,
  };
}

const FALLIDA = order({
  orderId: 'GPA.9999-0000-1111-22222',
  postingStatus: 'FAILED',
  postingError: 'Google no informó el neto del desarrollador',
  journalEntryId: null,
  journalEntryNumber: null,
});

const fila = (orderId: string): HTMLTableRowElement =>
  screen.getByText(orderId).closest('tr') as HTMLTableRowElement;

beforeEach(() => {
  vi.clearAllMocks();
  listError = false;
  items = [order()];
  retry.mockResolvedValue(undefined);
  for (const s of [
    'PENDING',
    'POSTED',
    'UNSUPPORTED_CURRENCY',
    'REVERSED',
    'FAILED',
    'SKIPPED',
    'NEEDS_REVIEW',
  ]) {
    counts[s] = 0;
  }
  counts.POSTED = 12;
  counts.FAILED = 2;
  countsError = false;
});

describe('FinancePlayOrders — la plata de Google se lee en la moneda del comprador', () => {
  it('pinta el bruto sin impuesto, la comisión y el neto con la moneda cruda de la orden', () => {
    items = [order({ totalCurrency: 'BRL', taxCurrency: 'BRL', developerRevenueCurrency: 'BRL' })];
    render(<FinancePlayOrders />);

    const row = fila('GPA.3311-1234-5678-90000');
    // 12.99 − 1.69: la resta se hace en céntimos, nunca con Number.
    expect(row).toHaveTextContent('11,30 BRL');
    expect(row).toHaveTextContent('1,69 BRL');
    expect(row).toHaveTextContent('9,61 BRL');
    expect(row).toHaveTextContent('2026-000001');
    expect(row).toHaveTextContent('Asentada');
  });

  it('una orden que mezcla monedas no inventa un bruto ni una comisión', () => {
    items = [order({ taxCurrency: 'CRC', commission: null })];
    render(<FinancePlayOrders />);

    const row = fila('GPA.3311-1234-5678-90000');
    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('cada estado se distingue por su etiqueta, no solo por el color', () => {
    items = [
      order({ orderId: 'o-1', postingStatus: 'NEEDS_REVIEW' }),
      order({ orderId: 'o-2', postingStatus: 'SKIPPED' }),
      order({ orderId: 'o-3', postingStatus: 'UNSUPPORTED_CURRENCY' }),
    ];
    render(<FinancePlayOrders />);

    expect(fila('o-1')).toHaveTextContent('Por revisar');
    expect(fila('o-2')).toHaveTextContent('Omitida');
    expect(fila('o-3')).toHaveTextContent('Moneda sin soporte');
  });
});

describe('FinancePlayOrders — reintentar', () => {
  const CON_REINTENTO: PlayOrderStatus[] = ['FAILED', 'NEEDS_REVIEW', 'UNSUPPORTED_CURRENCY'];
  const SIN_REINTENTO: PlayOrderStatus[] = ['POSTED', 'PENDING', 'REVERSED', 'SKIPPED'];

  it.each(CON_REINTENTO)('lo ofrece en %s, que es plata sin asentar', (postingStatus) => {
    items = [order({ postingStatus })];
    render(<FinancePlayOrders canWrite />);

    expect(
      within(fila('GPA.3311-1234-5678-90000')).getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it.each(SIN_REINTENTO)('no lo ofrece en %s: no hay nada que reintentar', (postingStatus) => {
    items = [order({ postingStatus })];
    render(<FinancePlayOrders canWrite />);

    expect(
      within(fila('GPA.3311-1234-5678-90000')).queryByRole('button', { name: 'Reintentar' }),
    ).toBeNull();
  });

  it('sin permiso de escritura la pantalla es de solo lectura', () => {
    items = [FALLIDA];
    render(<FinancePlayOrders />);

    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('pide confirmación antes de re-encolar el asiento', async () => {
    items = [FALLIDA];
    render(<FinancePlayOrders canWrite />);

    fireEvent.click(within(fila(FALLIDA.orderId)).getByRole('button', { name: 'Reintentar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reintentar el asiento')).toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith(FALLIDA.orderId));
  });

  it('el error del backend se lee donde se confirmó, no en un toast que se va', async () => {
    retry.mockRejectedValue(new Error('Esa orden de Google Play no está ingestada.'));
    items = [FALLIDA];
    render(<FinancePlayOrders canWrite />);

    fireEvent.click(within(fila(FALLIDA.orderId)).getByRole('button', { name: 'Reintentar' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('Esa orden de Google Play no está ingestada.'),
    ).toBeInTheDocument();
  });
});

describe('FinancePlayOrders — detalle', () => {
  it('explica por qué no hay asiento y muestra el impuesto como informativo', async () => {
    items = [FALLIDA];
    render(<FinancePlayOrders />);

    fireEvent.click(screen.getByText(FALLIDA.orderId));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Google no informó el neto del desarrollador'),
    ).toBeInTheDocument();
    // El impuesto va rotulado como lo que es: informativo, fuera del asiento.
    const impuesto = within(dialog).getByText(/^Impuesto/).closest('div') as HTMLElement;
    expect(impuesto).toHaveTextContent('no se asienta');
    expect(within(impuesto).getByText('1,69 USD')).toBeInTheDocument();
  });

  // Es lo único que explica por qué una orden omitida no tiene asiento y nunca
  // lo va a tener, y por qué reintentarla no cambiaría nada.
  it('muestra cuándo llegó el reembolso, si llegó', async () => {
    items = [
      order({
        orderId: 'o-reembolso',
        postingStatus: 'SKIPPED',
        refundRequestedAt: '2026-09-04T15:00:00.000Z',
      }),
    ];
    render(<FinancePlayOrders />);

    fireEvent.click(screen.getByText('o-reembolso'));

    const dialog = await screen.findByRole('dialog');
    const fila = within(dialog)
      .getByText('Reembolso solicitado el')
      .closest('div') as HTMLElement;
    expect(fila).toHaveTextContent('4/9/2026');
  });

  it('sin reembolso no inventa la fila', async () => {
    items = [order()];
    render(<FinancePlayOrders />);

    fireEvent.click(screen.getByText('GPA.3311-1234-5678-90000'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('Reembolso solicitado el')).toBeNull();
  });

  // Hay plata registrada y falta la moneda en la contabilidad: es una
  // advertencia, no un fallo. Pintarla de rojo mandaba a tratarla como un
  // asiento roto.
  it('una moneda sin soporte se explica en tono de advertencia, no de error', async () => {
    items = [order({ orderId: 'o-moneda', postingStatus: 'UNSUPPORTED_CURRENCY' })];
    render(<FinancePlayOrders />);

    fireEvent.click(screen.getByText('o-moneda'));

    const dialog = await screen.findByRole('dialog');
    const explicacion = within(dialog).getByText(/falta esa moneda en la contabilidad/);
    expect(explicacion).toHaveClass('text-warning');
    expect(explicacion).not.toHaveClass('text-destructive');
  });

  // El `raw` de la orden guarda lo que devolvió Google. No viaja en la lista y el
  // detalle no lo pinta: mostrarlo expondría en pantalla datos del comprador.
  it('no vuelca los datos crudos que devolvió Google', async () => {
    items = [{ ...order(), raw: { buyerAddress: { regionCode: 'CR' } } } as PlayOrder];
    render(<FinancePlayOrders />);

    fireEvent.click(screen.getByText('GPA.3311-1234-5678-90000'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/buyerAddress/)).toBeNull();
    expect(within(dialog).queryByText(/regionCode/)).toBeNull();
  });
});

describe('FinancePlayOrders — vacío y error no son lo mismo', () => {
  it('sin órdenes explica que aparecen solas con cada cobro', () => {
    items = [];
    render(<FinancePlayOrders />);

    expect(
      screen.getByText('Todavía no hay órdenes de Google Play registradas'),
    ).toBeInTheDocument();
  });

  it('con la lista caída no dice que no hay órdenes: dice que no pudo cargarlas', () => {
    items = [];
    listError = true;
    render(<FinancePlayOrders />);

    expect(screen.queryByText('Todavía no hay órdenes de Google Play registradas')).toBeNull();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('FinancePlayOrders — resumen en siete cards', () => {
  const resumen = () => screen.getByRole('group', { name: 'Órdenes por estado' });

  it('pinta una card por estado, cada una con su ícono y su conteo', () => {
    render(<FinancePlayOrders />);

    const cards = resumen().querySelectorAll('[data-slot="card"]');
    expect(cards).toHaveLength(7);
    // El ícono no es decorativo: es la segunda señal del estado, además del
    // tono. Una card sin ícono deja el color como único canal.
    for (const card of cards) expect(card.querySelector('svg')).not.toBeNull();

    expect(within(resumen()).getByText('Falló').closest('[data-slot="card"]')).toHaveTextContent(
      '2',
    );
    expect(within(resumen()).getByText('Asentada').closest('[data-slot="card"]')).toHaveTextContent(
      '12',
    );
  });

  it('las tres que requieren acción son botones; las otras cuatro, informativas', () => {
    render(<FinancePlayOrders />);

    for (const accionable of ['Falló', 'Por revisar', 'Moneda sin soporte']) {
      expect(within(resumen()).getByRole('button', { name: new RegExp(accionable) })).toBeTruthy();
    }
    // Con una orden asentada no hay nada que hacer: darle un botón sugeriría lo
    // contrario. El filtro por cualquier estado sigue en la barra de la tabla.
    for (const informativa of ['Asentada', 'Pendiente', 'Reversada', 'Omitida']) {
      expect(
        within(resumen()).queryByRole('button', { name: new RegExp(informativa) }),
      ).toBeNull();
    }
  });

  it('un clic en una card de acción filtra la tabla por ese estado', () => {
    render(<FinancePlayOrders />);

    fireEvent.click(within(resumen()).getByRole('button', { name: /Falló/ }));

    const filtro = screen.getByRole('combobox', { name: 'Filtrar por estado' });
    expect(filtro).toHaveTextContent('Falló');
    // Y el segundo clic lo quita: la card es un interruptor, no un viaje de ida.
    fireEvent.click(within(resumen()).getByRole('button', { name: /Falló/ }));
    expect(filtro).toHaveTextContent('Todos');
  });

  // Un conteo que no llegó no es un cero: sin señal, "0 órdenes que fallaron"
  // sobre un endpoint caído se lee como una buena noticia.
  it('con el conteo caído lo dice y ofrece reintentar, en vez de pintar ceros', () => {
    countsError = true;
    render(<FinancePlayOrders />);

    expect(within(resumen()).getAllByText('sin dato')).toHaveLength(7);
    expect(within(resumen()).queryByText('12')).toBeNull();
    expect(screen.getByText('No se pudo contar las órdenes por estado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchCounts).toHaveBeenCalled();
  });
});
