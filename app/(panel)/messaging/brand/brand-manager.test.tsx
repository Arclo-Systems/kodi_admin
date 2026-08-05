import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailBrand } from '@/hooks/use-email-brand';

const brand: EmailBrand = {
  instagramUrl: 'https://instagram.com/kodi.app',
  facebookUrl: null,
  tiktokUrl: null,
  whatsappUrl: null,
  websiteUrl: null,
  mascotUrl: null,
  wordmarkUrl: null,
  ctaColor: null,
  headlineColor: null,
  mascotSize: null,
  headlineSize: null,
  defaults: {
    mascotUrl: 'https://assets.kodi.test/koko.png',
    ctaColor: '#408D99',
    headlineColor: '#171717',
    mascotSize: 'md',
    headlineSize: 'md',
  },
};

const mutate = vi.fn();

vi.mock('@/hooks/use-email-brand', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-email-brand')>()),
  useEmailBrand: () => ({ data: brand, isLoading: false }),
  useUpdateEmailBrand: () => ({ mutate, isPending: false }),
}));

import { BrandManager } from './brand-manager';

const ctaHexInput = (): HTMLElement => screen.getByLabelText('Color del botón — código hex');
const saveButton = (): HTMLElement => screen.getByRole('button', { name: 'Guardar' });

beforeEach(() => {
  mutate.mockClear();
});

describe('BrandManager', () => {
  it('guarda la identidad tal como quedó en el form', () => {
    render(<BrandManager />);
    fireEvent.change(ctaHexInput(), { target: { value: '#2F6F7A' } });
    fireEvent.click(saveButton());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      ctaColor: '#2F6F7A',
      instagramUrl: 'https://instagram.com/kodi.app',
      headlineColor: null,
    });
  });

  // Espejo del 422 INSUFFICIENT_CTA_CONTRAST del backend: el texto del botón es
  // blanco y no se configura, así que un color claro dejaría el CTA ilegible en
  // TODOS los correos. El panel tiene que frenarlo antes del viaje.
  it('bloquea el guardado con un color de botón sin contraste y dice por qué', () => {
    render(<BrandManager />);
    fireEvent.change(ctaHexInput(), { target: { value: '#FFE066' } });

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/no se lee sobre este color/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('deja guardar en cuanto el color vuelve a contrastar', () => {
    render(<BrandManager />);
    fireEvent.change(ctaHexInput(), { target: { value: '#FFE066' } });
    fireEvent.change(ctaHexInput(), { target: { value: '#171717' } });

    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(/no se lee sobre este color/i)).not.toBeInTheDocument();
  });
});
