import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { CountryRollout } from '@/hooks/use-launches';

// El diálogo de alta/edición trae sus propios hooks de red; acá solo importa la grilla.
vi.mock('./country-edit-dialog', () => ({ CountryFormDialog: () => null }));

const rollout = (over: Partial<CountryRollout>): CountryRollout => ({
  country: 'CR',
  name: 'Costa Rica',
  status: 'planned',
  targetDate: null,
  launchedAt: null,
  notes: null,
  userGoal: null,
  publicoAnual: null,
  rank: null,
  registeredUsers: 0,
  activeUsers: 0,
  updatedAt: null,
  ...over,
});

// El backend manda la lista ya rankeada; la vista solo la respeta.
const LISTA: CountryRollout[] = [
  rollout({ country: 'CL', name: 'Chile', publicoAnual: 474_000, rank: 1 }),
  rollout({ country: 'GT', name: 'Guatemala', publicoAnual: 337_199, rank: 2 }),
  rollout({
    country: 'CR',
    name: 'Costa Rica',
    publicoAnual: 243_000,
    rank: 3,
    status: 'live',
    registeredUsers: 1_200,
  }),
  rollout({ country: 'HN', name: 'Honduras', status: 'paused', registeredUsers: 5 }),
  rollout({ country: 'CO', name: 'Colombia' }),
];

const remove = vi.fn();

vi.mock('@/hooks/use-launches', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-launches')>()),
  useCountryRollouts: () => ({ data: LISTA, isLoading: false, isError: false }),
  useCountryRolloutActions: () => ({
    create: { mutateAsync: vi.fn() },
    remove: { mutateAsync: remove },
  }),
}));

import { CountriesTab } from './countries-tab';

const renderTab = () => render(<CountriesTab role="admin" isGlobalScope />);

const cardDe = (nombre: string): HTMLElement => {
  const titulo = screen.getByText(nombre);
  const card = titulo.closest('[data-slot="card"]');
  if (!(card instanceof HTMLElement)) throw new Error(`Sin card para ${nombre}`);
  return card;
};

describe('CountriesTab', () => {
  it('respeta el orden del ranking que manda el backend', () => {
    renderTab();
    const nombres = ['Chile', 'Guatemala', 'Costa Rica', 'Honduras', 'Colombia'];
    const posiciones = nombres.map((n) => {
      const card = cardDe(n);
      return Array.from(document.querySelectorAll('[data-slot="card"]')).indexOf(card);
    });
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
  });

  it('numera el puesto solo en los países con público estimado', () => {
    renderTab();
    expect(within(cardDe('Chile')).getByText('#1')).toBeInTheDocument();
    expect(within(cardDe('Guatemala')).getByText('#2')).toBeInTheDocument();
    // Sin público no hay puesto que mostrar.
    expect(within(cardDe('Colombia')).queryByText(/^#/)).toBeNull();
  });

  it('muestra el público anual con separador de miles, y avisa cuando no hay dato', () => {
    renderTab();
    // es-CR agrupa con espacio duro (U+00A0). Testing Library normaliza los espacios del DOM,
    // así que el esperado se normaliza igual; y se compara contra el mismo formateo en vez de
    // contra un literal, para no depender del ICU con el que corra el runner.
    const esperado = (337_199).toLocaleString('es-CR').replace(/\s/g, ' ');
    expect(within(cardDe('Guatemala')).getByText(esperado)).toBeInTheDocument();
    expect(within(cardDe('Colombia')).getByText('Público sin estimar')).toBeInTheDocument();
  });

  it('un país LIVE no ofrece eliminar: su fila sostiene el registro del país', () => {
    renderTab();
    expect(within(cardDe('Costa Rica')).queryByRole('button', { name: /Eliminar/ })).toBeNull();
    // Y sigue siendo editable.
    expect(within(cardDe('Costa Rica')).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('un país con usuarios registrados tiene el eliminar deshabilitado', () => {
    renderTab();
    expect(within(cardDe('Honduras')).getByRole('button', { name: /Eliminar/ })).toBeDisabled();
  });

  it('un país sin usuarios sí se puede eliminar', () => {
    renderTab();
    expect(within(cardDe('Colombia')).getByRole('button', { name: /Eliminar/ })).toBeEnabled();
  });

  it('sin permiso de escritura no hay acciones ni botón de agregar', () => {
    render(<CountriesTab role="support" isGlobalScope />);
    expect(screen.queryByRole('button', { name: /Agregar país/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('un admin REGIONAL no puede tocar el roadmap: es una acción de scope global', () => {
    render(<CountriesTab role="admin" isGlobalScope={false} />);
    expect(screen.queryByRole('button', { name: /Agregar país/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });
});
