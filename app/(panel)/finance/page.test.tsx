import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUser } from '@/lib/auth';
import type { Action } from '@/lib/permissions';

const ADMIN = { id: 'a1', role: 'ADMIN', isGlobalScope: true } as unknown as AdminUser;

const requireAction = vi.fn<(action: Action) => Promise<AdminUser>>(async () => ADMIN);
let allowed: Action[] = ['view:finance'];

vi.mock('@/lib/guard', () => ({ requireAction: (action: Action) => requireAction(action) }));
vi.mock('@/lib/permissions', () => ({ can: (_role: string, a: Action) => allowed.includes(a) }));

import FinanceHome from './page';

// Las diez pantallas de la sección, en el orden en que se trabajan. La barra de
// pestañas se retiró (decisión del founder, 2026-09-06): este índice es la única
// navegación de finanzas, así que una card que falte deja una pantalla huérfana.
const CARDS: [string, string][] = [
  ['Dashboard', '/finance/dashboard'],
  ['Movimientos', '/finance/movimientos'],
  ['Play', '/finance/play'],
  ['Mayor', '/finance/mayor'],
  ['Comprobación', '/finance/comprobacion'],
  ['Balance general', '/finance/balance'],
  ['Flujo de caja', '/finance/flujo'],
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
});

describe('Índice de Finanzas', () => {
  it('pide view:finance antes de pintar nada', async () => {
    await renderHome();

    expect(requireAction).toHaveBeenCalledWith('view:finance');
  });

  it('pinta las diez pantallas, cada una con su ruta', async () => {
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
