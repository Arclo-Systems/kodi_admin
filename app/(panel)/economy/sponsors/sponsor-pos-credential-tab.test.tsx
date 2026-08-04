import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Sponsor } from '@/hooks/use-sponsors';

const sponsor: Sponsor = {
  id: 'spo-123',
  name: 'Café Kodi',
  logoUrl: null,
  brandColor: null,
  website: null,
  country: 'CR',
  isActive: true,
  pipelineStatus: 'active',
  currency: 'CRC',
  appliesIva: true,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  legalName: null,
  taxId: null,
  billingEmail: null,
  contractStartsAt: null,
  contractEndsAt: null,
  merchantSecretRotatedAt: null,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

const state = { sponsor };

vi.mock('@/hooks/use-sponsors', () => ({
  useSponsor: () => ({ data: state.sponsor, isLoading: false, isError: false }),
  useRotatePosCredential: () => ({ mutateAsync: vi.fn(), reset: vi.fn() }),
}));

import { SponsorPosCredentialTab, SecretDialog } from './sponsor-pos-credential-tab';

beforeEach(() => {
  state.sponsor = sponsor;
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

// El POS necesita DOS datos (X-Merchant-Id + X-Merchant-Secret). El ID es el uuid
// del sponsor y tiene que estar siempre a mano, tenga o no credencial emitida.
describe('SponsorPosCredentialTab', () => {
  it('sin credencial muestra el ID de comercio y ofrece generar', () => {
    render(<SponsorPosCredentialTab sponsorId={sponsor.id} canWrite />);

    expect(screen.getByText('Sin credencial')).toBeInTheDocument();
    expect(screen.getByText('spo-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generar credencial/i })).toBeInTheDocument();
  });

  it('con credencial muestra el ID de comercio y ofrece rotar', () => {
    state.sponsor = { ...sponsor, merchantSecretRotatedAt: '2026-08-02T10:00:00.000Z' };
    render(<SponsorPosCredentialTab sponsorId={sponsor.id} canWrite />);

    expect(screen.getByText('POS habilitado')).toBeInTheDocument();
    expect(screen.getByText('spo-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rotar credencial/i })).toBeInTheDocument();
  });

  it('sin permiso de escritura no renderiza acciones, pero sí el ID', () => {
    render(<SponsorPosCredentialTab sponsorId={sponsor.id} canWrite={false} />);

    expect(screen.getByText('spo-123')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generar credencial/i })).not.toBeInTheDocument();
  });

  it('copia el ID de comercio al portapapeles', () => {
    render(<SponsorPosCredentialTab sponsorId={sponsor.id} canWrite />);

    fireEvent.click(screen.getByRole('button', { name: 'Copiar ID de comercio' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('spo-123');
  });
});

describe('SecretDialog', () => {
  const props = {
    merchantId: 'spo-123',
    secret: 'sk_live_abc',
    copiedKey: null,
    onCopy: vi.fn(),
    onClose: vi.fn(),
  };

  it('muestra el par completo con sus headers', () => {
    render(<SecretDialog {...props} />);

    expect(screen.getByText('X-Merchant-Id')).toBeInTheDocument();
    expect(screen.getByText('spo-123')).toBeInTheDocument();
    expect(screen.getByText('X-Merchant-Secret')).toBeInTheDocument();
    expect(screen.getByText('sk_live_abc')).toBeInTheDocument();
  });

  it('"Copiar ambos" arma el bloque de headers', () => {
    const onCopy = vi.fn();
    render(<SecretDialog {...props} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: /copiar ambos/i }));
    expect(onCopy).toHaveBeenCalledWith(
      'pair',
      'X-Merchant-Id: spo-123\nX-Merchant-Secret: sk_live_abc',
      expect.any(String),
    );
  });

  // El secreto es irrecuperable: solo el botón explícito cierra el diálogo.
  it('no se cierra con Esc, sí con el botón', () => {
    const onClose = vi.fn();
    render(<SecretDialog {...props} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /ya la guardé/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('cerrado no renderiza nada', () => {
    render(<SecretDialog {...props} secret={null} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
