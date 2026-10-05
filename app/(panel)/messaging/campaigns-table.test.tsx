import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Campaign } from '@/hooks/use-messaging';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const PENDIENTE: Campaign = {
  id: 'c1',
  kind: 'broadcast',
  channel: 'email',
  status: 'pending_approval',
  subject: 'Novedades',
  body: 'Hola',
  headline: null,
  assetUrl: null,
  ctaLabel: null,
  ctaUrl: null,
  secondaryText: null,
  targetUserId: null,
  segmentId: 's1',
  estimatedCount: 5_000,
  sentCount: 0,
  failedCount: 0,
  createdAt: '2026-10-01T15:00:00.000Z',
  segment: { name: 'Todos' },
  targetUser: null,
};

vi.mock('@/hooks/use-messaging', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-messaging')>()),
  useCampaigns: () => ({
    data: { items: [PENDIENTE], total: 1, page: 1, pageSize: 20 },
    isLoading: false,
    isError: false,
  }),
  useCampaignMutations: () => ({
    approve: { mutateAsync: vi.fn() },
    sendNow: { mutateAsync: vi.fn() },
    cancel: { mutateAsync: vi.fn() },
  }),
}));

import { CampaignsTable } from './campaigns-table';

describe('CampaignsTable', () => {
  it('quien puede aprobar ve Aprobar en un broadcast pendiente', () => {
    render(<CampaignsTable canApprove />);
    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeInTheDocument();
  });

  it('sin permiso de aprobar (p. ej. admin regional) no se ofrece Aprobar', () => {
    render(<CampaignsTable canApprove={false} />);
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument();
  });
});
