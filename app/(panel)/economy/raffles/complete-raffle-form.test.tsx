import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RaffleDetail } from '@/hooks/use-raffles';

const setPublication = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/use-raffles', () => ({
  useRaffleActions: () => ({ setPublication }),
}));

vi.mock('@/hooks/use-sponsors', () => ({
  useSponsorOptions: () => ({ data: [] }),
}));

import { PublicationControl, hasRealPrize } from './complete-raffle-form';

const raffle = (over: Partial<RaffleDetail> = {}): RaffleDetail =>
  ({
    id: 'r1',
    prizeDescription: 'Una bici',
    publicationStatus: 'draft',
    ...over,
  }) as RaffleDetail;

describe('hasRealPrize', () => {
  it('el placeholder del cron no cuenta como premio', () => {
    expect(hasRealPrize('Premio por definir')).toBe(false);
    expect(hasRealPrize('   ')).toBe(false);
    expect(hasRealPrize('Una bici')).toBe(true);
  });
});

describe('PublicationControl', () => {
  beforeEach(() => {
    setPublication.mutateAsync.mockReset().mockResolvedValue(undefined);
  });

  it('en borrador avisa que el usuario no ve nada este mes', () => {
    render(<PublicationControl raffle={raffle()} />);
    expect(screen.getByText(/no ven nada este mes/i)).toBeInTheDocument();
  });

  it('sin premio real no deja publicar', () => {
    render(<PublicationControl raffle={raffle({ prizeDescription: 'Premio por definir' })} />);
    expect(screen.getByRole('button', { name: /publicar premiación/i })).toBeDisabled();
  });

  it('con premio cargado publica el mes', () => {
    render(<PublicationControl raffle={raffle()} />);
    fireEvent.click(screen.getByRole('button', { name: /publicar premiación/i }));
    expect(setPublication.mutateAsync).toHaveBeenCalledWith('published');
  });

  it('publicada, el botón la vuelve a esconder', () => {
    render(<PublicationControl raffle={raffle({ publicationStatus: 'published' })} />);
    fireEvent.click(screen.getByRole('button', { name: /ocultar premiación/i }));
    expect(setPublication.mutateAsync).toHaveBeenCalledWith('draft');
  });
});
