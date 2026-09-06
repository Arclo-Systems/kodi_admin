import type { ReactElement } from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FinanceKpis as Kpis, Metric } from '@/hooks/use-finance-planning';

let report: Kpis | undefined;
let reportError = false;
const refetch = vi.fn();
const lastQuery = vi.fn();

vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useFinanceKpis: (params: unknown) => {
    lastQuery(params);
    return {
      data: reportError ? undefined : report,
      isLoading: false,
      isError: reportError,
      error: reportError ? new Error('Se cayeron los KPIs') : null,
      refetch,
    };
  },
}));

import { FinanceKpis } from './finance-kpis';

const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

/** La tarjeta de un KPI, por su título: dos KPIs pueden valer lo mismo. */
const card = (title: string): HTMLElement => {
  const heading = screen.getByText(title);
  const element = heading.closest('[data-slot="card"]');
  if (!element) throw new Error(`No hay tarjeta para ${title}`);
  return element as HTMLElement;
};

const money = (value: string, label: string): Metric => ({
  value,
  unit: 'money',
  label,
  na: null,
});
const count = (value: string, label: string): Metric => ({ value, unit: 'count', label, na: null });

const REPORT: Kpis = {
  currency: 'CRC',
  period: '2026-08',
  year: 2026,
  month: 8,
  isCurrentMonth: false,
  range: { from: '2026-08-01T06:00:00.000Z', to: '2026-09-01T05:59:59.999Z' },
  metrics: {
    subscriptionRevenue: money('1100000.00', 'Cuenta 4110 del mayor: caja real, ya cobrada'),
    mrrEstimated: money('10000.00', 'Precio de lista × clientes activos HOY. No es caja'),
    arrFromRevenue: money('13200000.00', 'Ingresos por suscripciones del mes × 12'),
    marketingSpend: money('200000.00', 'Cuenta 6210 del mes'),
    activeSubscriptions: count('2', 'Clientes con suscripción vigente al cierre del mes'),
    activeAtMonthStart: count('2', 'Clientes vigentes al arrancar el mes: la base del churn'),
    newSubscriptions: count('1', 'Clientes que arrancaron en el mes'),
    churnedSubscriptions: count('1', 'Clientes cuya suscripción venció en el mes'),
    // Filas, no clientes: siempre ≥ que los clientes activos.
    moduleSubscriptions: count('3', 'Módulos suscritos vigentes al cierre del mes'),
    churnRate: { value: '0.5000', unit: 'ratio', label: 'Bajas ÷ vigentes al arrancar', na: null },
    arpu: money('550000.00', 'Ingresos ÷ clientes vigentes al cierre'),
    ltv: money('1100000.00', 'ARPU ÷ churn'),
    cac: money('200000.00', 'Marketing ÷ altas'),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  reportError = false;
  report = REPORT;
});

describe('FinanceKpis — los dos números de suscripciones son dos cosas distintas', () => {
  it('les pone nombres distintos y muestra la definición de cada uno', () => {
    render(<FinanceKpis />);

    expect(
      screen.getByText('Ingresos por suscripciones del mes (caja real)'),
    ).toBeInTheDocument();
    expect(screen.getByText('MRR estimado (precio de lista × activas)')).toBeInTheDocument();
    expect(screen.getByText(/Cuenta 4110 del mayor/)).toBeInTheDocument();
    expect(screen.getByText(/Precio de lista × clientes activos HOY/)).toBeInTheDocument();
  });

  it('formatea cada unidad según lo que es: plata con moneda, conteo entero, churn en %', () => {
    render(<FinanceKpis />);

    expect(card('Ingresos por suscripciones del mes (caja real)')).toHaveTextContent(
      '1 100 000,00 CRC',
    );
    expect(card('Clientes activos al cierre')).toHaveTextContent('2');
    // 0.5000 es una fracción: pintarla cruda diría "0,5 %" en vez de la mitad.
    expect(card('Churn del mes')).toHaveTextContent('50,00 %');
  });
});

describe('FinanceKpis — un N/A no es un cero', () => {
  const naMetric = (unit: Metric['unit'], reason: Metric['na']): Metric => ({
    value: null,
    unit,
    label: 'Definición de la métrica',
    na: reason,
  });

  beforeEach(() => {
    report = {
      ...REPORT,
      metrics: {
        ...REPORT.metrics,
        ltv: naMetric('money', {
          reason: 'SIN_CHURN_MEDIBLE',
          message: 'No hubo bajas en el mes: el LTV sería infinito.',
        }),
        cac: naMetric('money', {
          reason: 'SIN_GASTO_DE_MARKETING',
          message: 'No hay gasto en 6210 este mes.',
        }),
      },
    };
  });

  it('pinta "N/A" y nunca un cero en su lugar', () => {
    render(<FinanceKpis />);

    expect(screen.getAllByText('N/A')).toHaveLength(2);
    expect(screen.queryByText('0,00 CRC')).toBeNull();
  });

  it('deja el motivo a la vista sin depender del mouse: va en el nombre accesible', () => {
    render(<FinanceKpis />);

    expect(
      screen.getByRole('button', { name: 'N/A: No hubo bajas en el mes: el LTV sería infinito.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'N/A: No hay gasto en 6210 este mes.' }),
    ).toBeInTheDocument();
  });
});

describe('FinanceKpis — el mes en curso se avisa', () => {
  it('dice que las cifras van a seguir subiendo', () => {
    report = { ...REPORT, isCurrentMonth: true, period: '2026-09' };
    render(<FinanceKpis />);

    expect(screen.getByText(/todavía no terminó/)).toBeInTheDocument();
  });

  it('sin mes elegido no manda ni año ni mes: el backend responde 400 si viaja uno solo', () => {
    render(<FinanceKpis />);

    expect(lastQuery).toHaveBeenCalledWith({ currency: 'CRC' });
  });
});

describe('FinanceKpis — los trece números tienen jerarquía', () => {
  it('los agrupa por lo que responden', () => {
    render(<FinanceKpis />);

    for (const grupo of ['Ingresos del mes', 'Clientes', 'Ratios']) {
      expect(screen.getByRole('heading', { name: grupo })).toBeInTheDocument();
    }
  });

  it('los módulos suscritos van como dato secundario, no como una tarjeta más', () => {
    render(<FinanceKpis />);

    // Es el único conteo de FILAS entre cuatro de clientes: darle la misma
    // tarjeta lo haría leer como uno más de ellos.
    const modulos = screen.getByText(/Módulos suscritos vigentes/);
    expect(modulos.closest('[data-slot="card"]')).toBeNull();
    expect(modulos).toHaveTextContent('3');
  });
});

describe('FinanceKpis — un reporte caído no es un mes en cero', () => {
  it('lo dice, ofrece reintentar y no deja tarjetas cargando para siempre', () => {
    reportError = true;
    const { container } = render(<FinanceKpis />);

    expect(screen.getByText('Se cayeron los KPIs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('N/A')).toBeNull();
    // Un esqueleto que nunca se va se lee como "todavía está cargando".
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
    expect(screen.queryByText('ARPU')).toBeNull();
  });
});
