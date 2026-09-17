import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PromoOffer } from '@/hooks/use-promo-offers';

const create = vi.fn();
const update = vi.fn();
let offers: PromoOffer[] = [];

vi.mock('@/hooks/use-promo-offers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-promo-offers')>()),
  usePromoOffers: () => ({ data: offers, isLoading: false, isError: false }),
  usePromoOffer: () => ({ data: null, isLoading: false }),
  usePromoOfferMutations: () => ({
    create: { mutateAsync: create, isPending: false },
    update: { mutateAsync: update, isPending: false },
    setPrices: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/hooks/use-store', () => ({
  useStoreItems: () => ({ data: { items: [] }, isLoading: false }),
}));

import { PromoOffersManager } from './promo-offers-manager';

const DEFAULT_OPTION = /Default \(todos los países, USD\)/;

function offer(over: Partial<PromoOffer> = {}): PromoOffer {
  return {
    id: 'o1',
    slug: 'founder-cr',
    label: 'Oferta Fundador',
    country: 'CR',
    priceMode: 'explicit',
    discountPercent: null,
    currency: 'USD',
    slotsTotal: 1250,
    slotsClaimed: 0,
    startsAt: null,
    endsAt: null,
    badgeItemId: null,
    isActive: true,
    ...over,
  };
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function pickOption(comboboxName: string | RegExp, optionName: string | RegExp): Promise<void> {
  fireEvent.click(await screen.findByRole('combobox', { name: comboboxName }));
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

beforeEach(() => {
  vi.clearAllMocks();
  offers = [];
  create.mockResolvedValue({});
  update.mockResolvedValue({});
});

describe('PromoOffersManager — oferta Default (sin país)', () => {
  it('elegir Default manda country: null y moneda USD', async () => {
    render(<PromoOffersManager canUseDefault />);

    type('Slug (estable)', 'founder-default');
    type('Nombre', 'Oferta Fundador');
    await pickOption('País', DEFAULT_OPTION);

    fireEvent.click(screen.getByRole('button', { name: /crear oferta/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ country: null, currency: 'USD' }),
    );
  });

  it('un país concreto sigue viajando como código', async () => {
    render(<PromoOffersManager canUseDefault />);

    type('Slug (estable)', 'founder-gt');
    type('Nombre', 'Oferta Fundador GT');
    await pickOption('País', /GT · Guatemala/);

    fireEvent.click(screen.getByRole('button', { name: /crear oferta/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ country: 'GT' }));
  });

  it('con Default la moneda queda fija en USD (no editable)', async () => {
    render(<PromoOffersManager canUseDefault />);

    await pickOption('Moneda', /CRC/);
    await pickOption('País', DEFAULT_OPTION);

    const moneda = await screen.findByRole('combobox', { name: 'Moneda' });
    expect(moneda).toHaveTextContent(/USD/);
    expect(moneda).toBeDisabled();
  });

  it('el listado rotula country null como Default', () => {
    offers = [offer({ id: 'o2', slug: 'founder-default', country: null })];
    render(<PromoOffersManager canUseDefault />);

    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('Default')).toBeInTheDocument();
  });

  it('sin permiso de Default, la opción no está en el selector de país', async () => {
    render(<PromoOffersManager canUseDefault={false} />);

    fireEvent.click(await screen.findByRole('combobox', { name: 'País' }));

    expect(await screen.findByRole('option', { name: /CR · Costa Rica/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: DEFAULT_OPTION })).toBeNull();
  });
});
