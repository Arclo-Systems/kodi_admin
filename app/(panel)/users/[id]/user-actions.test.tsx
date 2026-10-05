import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { AdminRole } from '@/lib/auth';
import type { Action } from '@/lib/permissions';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Los sub-diálogos traen su propio formulario y red; acá solo importa qué ofrece el menú.
vi.mock('./actions/ban-action', () => ({ BanAction: () => null }));
vi.mock('./actions/adjust-balance-action', () => ({ AdjustBalanceAction: () => null }));
vi.mock('./actions/email-change-action', () => ({ EmailChangeAction: () => null }));
vi.mock('./actions/send-message-action', () => ({ SendMessageAction: () => null }));
// Hoy ninguna acción de usuario exige alcance global; se simula una para comprobar que el menú
// filtra con el alcance y no solo con el rol.
vi.mock('@/lib/permissions', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/permissions')>();
  return {
    ...real,
    canWithScope: (role: AdminRole, isGlobalScope: boolean, action: Action) =>
      action === 'user:delete' ? isGlobalScope && real.can(role, action) : real.canWithScope(role, isGlobalScope, action),
  };
});

import { UserActions } from './user-actions';

const USER = { id: 'u1', accountStatus: 'active', isBot: false };

// Radix abre el menú en `pointerdown`, no en `click`.
function abrirMenu(): void {
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Acciones' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
}

const opciones = (): string[] => screen.getAllByRole('menuitem').map((el) => el.textContent ?? '');

describe('UserActions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('un admin ve todas las acciones, incluido el reset cosmético', () => {
    render(<UserActions user={USER} role="admin" isGlobalScope />);
    abrirMenu();
    expect(opciones()).toEqual([
      'Reset password',
      'Forzar logout',
      'Ajustar balance',
      'Reset streak',
      'Enviar mensaje',
      'Banear',
      'Reset cosmético',
      'Cambiar email',
      'Borrar cuenta',
    ]);
  });

  it('soporte no ve lo que el servidor le rechazaría', () => {
    render(<UserActions user={USER} role="support" isGlobalScope />);
    abrirMenu();
    const visibles = opciones();
    expect(visibles).toContain('Banear');
    expect(visibles).toContain('Reset password');
    expect(visibles).not.toContain('Enviar mensaje');
    expect(visibles).not.toContain('Reset cosmético');
    expect(visibles).not.toContain('Cambiar email');
    expect(visibles).not.toContain('Borrar cuenta');
    expect(screen.queryByText('Admin only')).toBeNull();
  });

  it('un admin sin alcance global no ve una acción que exige alcance global', () => {
    render(<UserActions user={USER} role="admin" isGlobalScope={false} />);
    abrirMenu();
    const visibles = opciones();
    expect(visibles).toContain('Cambiar email');
    expect(visibles).not.toContain('Borrar cuenta');
  });

  it('un rol sin ninguna acción sobre usuarios no ve el menú', () => {
    render(<UserActions user={USER} role="editor" isGlobalScope />);
    expect(screen.queryByRole('button', { name: 'Acciones' })).toBeNull();
  });

  it('el reset cosmético pide confirmar y llama a la ruta BFF sin cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<UserActions user={USER} role="admin" isGlobalScope />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset cosmético' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/users/u1/reset-cosmetic');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });
});
