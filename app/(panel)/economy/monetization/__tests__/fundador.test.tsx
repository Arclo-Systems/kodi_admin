import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FundadorPanel } from '../fundador/fundador-panel';

// §7.6: un reembolso revoca el estatus de fundador pero NO devuelve el lugar. Si el
// panel mostrara un solo número, "lugares entregados" se leería como "suscriptores
// fundadores" y todo el reporting de MRR quedaría inflado por los reembolsados.
describe('FundadorPanel — los dos contadores van separados', () => {
  const data = {
    slotsTotal: 500,
    slotsClaimed: 12,
    slotsReserved: 3,
    activeFounders: 11,
    slotsAvailable: 485,
    label: 'Fundador CR',
    slug: 'founder-cr',
    isActive: true,
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

  // El backend es la autoridad del cálculo: el panel pinta lo que llega, no su propia resta.
  it('pinta los disponibles que manda el backend', () => {
    render(<FundadorPanel data={{ ...data, slotsAvailable: 300 }} />);

    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.queryByText('485')).not.toBeInTheDocument();
  });

  it('identifica de qué oferta son los números y si está activa', () => {
    render(<FundadorPanel data={data} />);

    expect(screen.getByText('Fundador CR')).toBeInTheDocument();
    expect(screen.getByText('founder-cr')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('nunca pinta un número negativo de disponibles', () => {
    render(
      <FundadorPanel
        data={{ ...data, slotsTotal: 10, slotsAvailable: undefined }}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
