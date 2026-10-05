import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { HealthIntegrations } from './health-integrations';

function renderWithQuery(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HealthIntegrations />
    </QueryClientProvider>,
  );
}

describe('HealthIntegrations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chequea Brevo y FCM y ya no muestra ni consulta PostHog', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: { ok: true, message: 'Conectado' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery();

    expect(screen.getByText('Brevo (email)')).toBeInTheDocument();
    expect(screen.getByText('FCM (push)')).toBeInTheDocument();
    expect(screen.queryByText(/posthog/i)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const urls = fetchMock.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls.some((url) => url.includes('posthog'))).toBe(false);
  });
});
