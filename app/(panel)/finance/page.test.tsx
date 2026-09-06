import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUser } from '@/lib/auth';
import type { Action } from '@/lib/permissions';

const ADMIN = { id: 'a1', role: 'ADMIN', isGlobalScope: true } as unknown as AdminUser;

const requireAction = vi.fn<(action: Action) => Promise<AdminUser>>(async () => ADMIN);
let allowed: Action[] = ['view:finance'];

vi.mock('@/lib/guard', () => ({ requireAction: (action: Action) => requireAction(action) }));
vi.mock('@/lib/permissions', () => ({ can: (_role: string, a: Action) => allowed.includes(a) }));

let sinVer: number | undefined = 0;
let conteoCaido = false;
vi.mock('@/hooks/use-finance-planning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-finance-planning')>()),
  useUnseenFinanceAlerts: () => ({
    count: conteoCaido ? undefined : sinVer,
    isLoading: false,
    isError: conteoCaido,
  }),
}));

import FinanceHome from './page';

// Las diecisiete pantallas de la sección, en el orden en que se trabajan. La barra
// de pestañas se retiró (decisión del founder, 2026-09-06): este índice es la
// única navegación de finanzas, así que una card que falte deja una pantalla
// huérfana.
const CARDS: [string, string][] = [
  ['Dashboard', '/finance/dashboard'],
  ['Movimientos', '/finance/movimientos'],
  ['Play', '/finance/play'],
  ['Mayor', '/finance/mayor'],
  ['Comprobación', '/finance/comprobacion'],
  ['Balance general', '/finance/balance'],
  ['Flujo de caja', '/finance/flujo'],
  ['Presupuesto', '/finance/presupuesto'],
  ['KPIs', '/finance/kpis'],
  ['Proyección', '/finance/proyeccion'],
  ['Alertas', '/finance/alertas'],
  ['Impuestos', '/finance/impuestos'],
  ['Cierre mensual', '/finance/cierre'],
  ['Paquete del contador', '/finance/paquete-contador'],
  ['Cuentas', '/finance/cuentas'],
  ['Categorías', '/finance/categorias'],
  ['Tipos de cambio', '/finance/tipos-de-cambio'],
];

async function renderHome(): Promise<void> {
  render(await FinanceHome());
}

beforeEach(() => {
  vi.clearAllMocks();
  allowed = ['view:finance'];
  sinVer = 0;
  conteoCaido = false;
});

describe('Índice de Finanzas', () => {
  it('pide view:finance antes de pintar nada', async () => {
    await renderHome();

    expect(requireAction).toHaveBeenCalledWith('view:finance');
  });

  it('pinta las diecisiete pantallas, cada una con su ruta', async () => {
    await renderHome();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(CARDS.length);
    for (const [label, href] of CARDS) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
    }
  });

  it('las mantiene en el orden de trabajo, no en el alfabético', async () => {
    await renderHome();

    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(CARDS.map(([, href]) => href));
  });

  it('sin view:finance no ofrece ninguna card', async () => {
    allowed = [];
    await renderHome();

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

// Sin correo a admins, este banner es el canal: una alerta que solo vive en su
// pantalla no la ve nadie hasta que entre a buscarla.
describe('Índice de Finanzas — el banner de alertas sin ver', () => {
  it('cuenta cuántas hay y lleva a la pantalla', async () => {
    sinVer = 3;
    await renderHome();

    expect(screen.getByText('Hay 3 alertas financieras sin ver.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver alertas' })).toHaveAttribute(
      'href',
      '/finance/alertas',
    );
  });

  it('con una sola no dice "1 alertas"', async () => {
    sinVer = 1;
    await renderHome();

    expect(screen.getByText('Hay 1 alerta financiera sin ver.')).toBeInTheDocument();
  });

  it('sin alertas pendientes no ocupa espacio', async () => {
    await renderHome();

    expect(screen.queryByText(/sin ver/)).toBeNull();
  });

  it('con el conteo caído no afirma que no hay nada pendiente', async () => {
    conteoCaido = true;
    await renderHome();

    expect(screen.queryByText(/sin ver/)).toBeNull();
  });
});
