import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionExpiryProvider } from './session-expiry-provider';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '@/lib/session-expiry';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const fetchMock = vi.fn();

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderProvider(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SessionExpiryProvider />
    </QueryClientProvider>,
  );
}

describe('SessionExpiryProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = `admin_at_exp=${Date.now() + 15 * 60_000}; path=/`;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('no molesta mientras la sesión está fresca', () => {
    renderProvider();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('avisa antes de expirar por inactividad', () => {
    renderProvider();

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(
      screen.getByRole('heading', { name: /tu sesión está por expirar/i }),
    ).toBeVisible();
  });

  it('extiende la sesión y cierra el aviso', async () => {
    renderProvider();
    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    await act(async () => {
      screen.getByRole('button', { name: /seguir conectado/i }).click();
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra la sesión y avisa el motivo al agotarse la inactividad', async () => {
    renderProvider();

    await act(async () => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
    });
    await flushPromises();

    expect(replace).toHaveBeenCalledWith('/login?reason=expired');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('renueva en silencio cuando el access está por vencer y el admin sigue activo', async () => {
    document.cookie = `admin_at_exp=${Date.now() + 61_000}; path=/`;
    renderProvider();

    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
