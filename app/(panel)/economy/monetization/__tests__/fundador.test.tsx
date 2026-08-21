import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FundadorPanel } from '../fundador/fundador-panel';

vi.mock('@/hooks/use-store-monetization', () => ({
  useFounderOffer: () => ({ data: undefined, isLoading: false, error: null }),
}));

// §7.6: un reembolso revoca el estatus de fundador pero NO devuelve el lugar. Si el
// panel mostrara un solo número, "lugares entregados" se leería como "suscriptores
// fundadores" y todo el reporting de MRR quedaría inflado por los reembolsados.
describe('FundadorPanel — los dos contadores van separados', () => {
  const data = {
    slotsTotal: 500,
    slotsClaimed: 12,
    slotsReserved: 3,
    activeFounders: 11,
  };

  it('rotula el contador como lugares entregados y aclara que incluye reembolsados', () => {
    render(<FundadorPanel data={data} />);

    expect(screen.getAllByText(/lugares entregados/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/incluye reembolsados/i)).toBeInTheDocument();
  });

  it('muestra los fundadores vigentes al lado, con su propio rótulo', () => {
    render(<FundadorPanel data={data} />);

    expect(screen.getAllByText(/fundadores vigentes/i).length).toBeGreaterThan(0);
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('calcula los disponibles descontando entregados y apartados', () => {
    render(<FundadorPanel data={data} />);

    expect(screen.getByText('485')).toBeInTheDocument();
  });

  it('nunca pinta un número negativo de disponibles', () => {
    render(<FundadorPanel data={{ ...data, slotsTotal: 10 }} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('-5')).not.toBeInTheDocument();
  });
});
