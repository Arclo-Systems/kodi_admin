import type { ReactElement } from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Forecast, ForecastPoint, Runway } from '@/hooks/use-finance-planning';

let report: Forecast | undefined;
let runway: Runway | undefined;
let reportError = false;
const refetch = vi.fn();

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useForecast: () => ({
    data: reportError ? undefined : report,
    isLoading: false,
    isError: reportError,
    error: reportError ? new Error('Se cayó la proyección') : null,
    refetch,
  }),
  useRunway: () => ({
    data: runway,
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  }),
}));

import { FinanceForecast } from './finance-forecast';

const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

/** La fila de un mes proyectado, dentro de la tabla que solo lista proyecciones. */
const filaProyectada = (mes: string): HTMLElement => {
  const tabla = screen.getByText('Meses proyectados').closest('[data-slot="card"]');
  if (!tabla) throw new Error('No hay tabla de meses proyectados');
  const row = within(tabla as HTMLElement).getByText(mes).closest('tr');
  if (!row) throw new Error(`No hay fila para ${mes}`);
  return row;
};

/** La cifra de la pista, por su rótulo: la quema del promedio y la de un mes suelto valen igual. */
const figura = (label: string | RegExp): HTMLElement => {
  const parent = screen.getByText(label).parentElement;
  if (!parent) throw new Error('La cifra no tiene contenedor');
  return parent;
};

const point = (
  month: string,
  income: string,
  expense: string,
  net: string,
  isProjection: boolean,
  negativeProjection = false,
): ForecastPoint => ({ month, income, expense, net, isProjection, negativeProjection });

const REPORT: Forecast = {
  currency: 'CRC',
  method: 'linear',
  label: 'Proyección, no dato: recta de mínimos cuadrados sobre los meses completos del mayor.',
  horizon: 3,
  basisMonths: 4,
  history: [
    point('2026-05', '0.00', '50000.00', '-50000.00', false),
    point('2026-06', '0.00', '100000.00', '-100000.00', false),
    point('2026-07', '0.00', '150000.00', '-150000.00', false),
    point('2026-08', '0.00', '200000.00', '-200000.00', false),
  ],
  projection: [
    point('2026-09', '0.00', '250000.00', '-250000.00', true),
    // `negativeProjection` del backend es "ingresos o gastos proyectados < 0"
    // (`forecast.service.ts:197`), NO el neto: acá la recta de ingresos es la
    // que cayó. Un neto negativo con la bandera puesta es un estado que el
    // backend no produce.
    point('2026-10', '-50000.00', '300000.00', '-350000.00', true, true),
  ],
  fit: {
    income: {
      slope: '0.0000',
      intercept: '0.0000',
      r2: null,
      r2Na: { reason: 'SERIE_CONSTANTE', message: 'La serie no se mueve: el R² sería 0 ÷ 0.' },
    },
    expense: { slope: '50000.0000', intercept: '50000.0000', r2: '1.0000', r2Na: null },
  },
  na: null,
};

const RUNWAY: Runway = {
  currency: 'CRC',
  asOf: '2026-09-16T05:59:59.999Z',
  cashBalance: '750000.00',
  burn: {
    months: [
      { month: '2026-06', burn: '100000.00' },
      { month: '2026-07', burn: '150000.00' },
      { month: '2026-08', burn: '200000.00' },
    ],
    average: '150000.00',
    basisMonths: 3,
  },
  runwayMonths: '5.0',
  na: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  reportError = false;
  report = REPORT;
  runway = RUNWAY;
});

describe('FinanceForecast — el método está a la vista', () => {
  it('dice sobre cuántos meses proyecta, con el r² de cada serie, y que no es un dato', () => {
    render(<FinanceForecast />);

    expect(screen.getByText(/Proyección lineal sobre 4 meses/)).toBeInTheDocument();
    expect(screen.getByText(/r² gastos = 1,0000/)).toBeInTheDocument();
    expect(screen.getByText('No es un dato.')).toBeInTheDocument();
  });

  it('un r² que no existe sale con su motivo, no como 0', () => {
    render(<FinanceForecast />);

    expect(screen.getByText(/r² ingresos = N\/A \(La serie no se mueve/)).toBeInTheDocument();
  });
});

describe('FinanceForecast — histórico y proyección no se confunden', () => {
  it('nombra cuál línea es medida y cuál es la recta', () => {
    render(<FinanceForecast />);

    expect(screen.getByText(/Línea sólida: lo que pasó, del libro mayor/)).toBeInTheDocument();
    expect(screen.getByText(/Línea punteada: la recta/)).toBeInTheDocument();
  });

  it('lista los meses proyectados aparte, y marca el que cayó bajo cero', () => {
    render(<FinanceForecast />);

    const tabla = screen.getByText('Meses proyectados').closest('[data-slot="card"]');
    expect(tabla).not.toBeNull();
    const filas = within(tabla as HTMLElement).getAllByRole('row');
    // Encabezado + los dos meses proyectados: el histórico NO entra en esta tabla.
    expect(filas).toHaveLength(3);
    expect(within(tabla as HTMLElement).getByText('2026-10')).toBeInTheDocument();
    expect(within(tabla as HTMLElement).queryByText('2026-08')).toBeNull();
  });
});

// Un neto negativo es el resultado NORMAL de una empresa que todavía no factura;
// unos ingresos negativos son un imposible que delata que el horizonte es
// demasiado largo para los datos. Marcarlos en el mismo lugar los confunde.
describe('FinanceForecast — el imposible se marca en la serie que cayó, no en el neto', () => {
  it('marca los ingresos proyectados bajo cero y deja el neto sin marcar', () => {
    render(<FinanceForecast />);

    const celdas = within(filaProyectada('2026-10')).getAllByRole('cell');
    expect(celdas[1]).toHaveTextContent('proyección imposible: < 0');
    expect(celdas[2]).not.toHaveTextContent('proyección imposible');
    // El neto es −350 000 y NO se marca.
    expect(celdas[3]).toHaveTextContent('-350 000,00');
    expect(celdas[3]).not.toHaveTextContent('proyección imposible');
  });

  it('un mes con las dos series por encima de cero no lleva marcador, aunque el neto sea negativo', () => {
    render(<FinanceForecast />);

    const celdas = within(filaProyectada('2026-09')).getAllByRole('cell');
    expect(celdas[3]).toHaveTextContent('-250 000,00');
    for (const celda of celdas) expect(celda).not.toHaveTextContent('proyección imposible');
  });
});

describe('FinanceForecast — sin historia suficiente no hay recta', () => {
  it('lo dice con el motivo y no inventa una proyección', () => {
    report = {
      ...REPORT,
      projection: [],
      fit: null,
      basisMonths: 2,
      na: {
        reason: 'HISTORIAL_INSUFICIENTE',
        message: 'Hacen falta 3 meses completos y hay 2.',
      },
    };
    render(<FinanceForecast />);

    expect(screen.getByText(/Hacen falta 3 meses completos y hay 2/)).toBeInTheDocument();
    expect(screen.queryByText('Meses proyectados')).toBeNull();
  });
});

describe('FinanceRunway — la pista se dice o se explica, nunca se inventa', () => {
  it('con quema medible muestra saldo, promedio y meses', () => {
    render(<FinanceForecast />);

    expect(within(figura('Saldo de caja')).getByText('750 000,00 CRC')).toBeInTheDocument();
    expect(within(figura(/Quema promedio/)).getByText('150 000,00 CRC')).toBeInTheDocument();
    expect(within(figura('Meses de pista')).getByText('5,0 meses')).toBeInTheDocument();
  });

  it('sin quema neta dice N/A con el motivo, y NUNCA infinito ni cero', () => {
    runway = {
      ...RUNWAY,
      runwayMonths: null,
      na: {
        reason: 'SIN_QUEMA_NETA',
        message: 'Entró más plata de la que salió en los últimos 3 meses completos.',
      },
    };
    render(<FinanceForecast />);

    expect(
      screen.getByRole('button', { name: /N\/A: Entró más plata de la que salió/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('0,0 meses')).toBeNull();
    expect(screen.queryByText('∞')).toBeNull();
    // El saldo y la quema sí existen: se muestran igual.
    expect(screen.getByText('750 000,00 CRC')).toBeInTheDocument();
  });
});

describe('FinanceForecast — un reporte caído no es un histórico vacío', () => {
  it('lo dice y ofrece reintentar', () => {
    reportError = true;
    render(<FinanceForecast />);

    expect(screen.getByText('Se cayó la proyección')).toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar la serie.')).toBeInTheDocument();
    expect(screen.queryByText(/no hay serie que proyectar/)).toBeNull();
  });
});
