import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnergyConfig, EnergyConfigInput } from '@/hooks/use-energy-config';

const saveEnergy = vi.fn();
let config: EnergyConfig | null = null;

vi.mock('@/hooks/use-energy-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-energy-config')>()),
  useEnergyConfig: () => ({ data: config, isLoading: false, isError: false }),
  useEnergyMutations: () => ({
    saveEnergy: { mutateAsync: saveEnergy, isPending: false },
  }),
}));

import { EnergyConfigForm } from './energy-config-form';

function energyConfig(over: Partial<EnergyConfig> = {}): EnergyConfig {
  return {
    id: 'ec-1',
    country: null,
    maxEnergy: 25,
    regenMinutes: 6,
    costPerMatch: 2,
    costDuelo: null,
    costArenaRapida: null,
    costArenaAmigos: null,
    costContrarreloj: null,
    costSupervivencia: null,
    adBonus: 3,
    refillCostKokos: 50,
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

const MODE_LABELS = [
  'Duelo',
  'Arena rápida',
  'Arena con amigos',
  'Contrarreloj',
  'Supervivencia',
] as const;

const save = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar energía' }));
};

const savedInput = async (): Promise<EnergyConfigInput> => {
  await waitFor(() => expect(saveEnergy).toHaveBeenCalled());
  const [input] = saveEnergy.mock.calls[0] as [EnergyConfigInput];
  return input;
};

const typeIn = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  config = energyConfig();
  saveEnergy.mockResolvedValue(undefined);
});

describe('EnergyConfigForm — costo por modo', () => {
  it('muestra los cinco modos vacíos cuando ninguno tiene costo propio', () => {
    render(<EnergyConfigForm country={null} />);

    for (const label of MODE_LABELS) {
      expect(screen.getByLabelText(label)).toHaveValue(null);
    }
  });

  it('manda null en los cinco modos cuando quedan vacíos', async () => {
    render(<EnergyConfigForm country={null} />);

    save();

    expect(await savedInput()).toMatchObject({
      costPerMatch: 2,
      costDuelo: null,
      costArenaRapida: null,
      costArenaAmigos: null,
      costContrarreloj: null,
      costSupervivencia: null,
    });
  });

  it('manda el número del modo que recibió un costo propio y deja los demás heredando', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Duelo', '3');
    save();

    expect(await savedInput()).toMatchObject({
      costDuelo: 3,
      costArenaRapida: null,
      costArenaAmigos: null,
      costContrarreloj: null,
      costSupervivencia: null,
    });
  });

  it('acepta 0 como costo propio: el modo queda gratis, no heredando', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Supervivencia', '0');
    save();

    expect(await savedInput()).toMatchObject({ costSupervivencia: 0 });
  });

  it('precarga el costo propio guardado del modo', () => {
    config = energyConfig({ costArenaRapida: 4 });
    render(<EnergyConfigForm country={null} />);

    expect(screen.getByLabelText('Arena rápida')).toHaveValue(4);
  });

  it('vaciar un modo que tenía costo propio lo devuelve a heredar (null)', async () => {
    config = energyConfig({ costArenaRapida: 4 });
    render(<EnergyConfigForm country={null} />);

    typeIn('Arena rápida', '');
    save();

    expect(await savedInput()).toMatchObject({ costArenaRapida: null });
  });

  it('rechaza un costo negativo y no guarda', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Contrarreloj', '-1');
    save();

    expect(await screen.findByText('Debe ser un entero de 0 o más')).toBeInTheDocument();
    expect(saveEnergy).not.toHaveBeenCalled();
  });

  it('rechaza un costo decimal y no guarda', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Arena con amigos', '1.5');
    save();

    expect(await screen.findByText('Debe ser un entero de 0 o más')).toBeInTheDocument();
    expect(saveEnergy).not.toHaveBeenCalled();
  });

  it('explica la herencia mostrando el costo general vigente', () => {
    render(<EnergyConfigForm country={null} />);

    expect(screen.getByText(/vacío = usa el costo general \(2\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Duelo')).toHaveAttribute('placeholder', '2');
  });

  // El form va con noValidate: si lo valida el navegador, bloquea el submit por min/step y el
  // founder ve una burbuja nativa en vez del mensaje del panel.
  it('vaciar un campo obligatorio muestra el mensaje del panel, en español', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Tope de energía', '');
    save();

    expect(await screen.findByText('Debe ser un entero de 1 o más')).toBeInTheDocument();
    expect(saveEnergy).not.toHaveBeenCalled();
  });

  it('la herencia sigue al costo general que el founder está editando', async () => {
    render(<EnergyConfigForm country={null} />);

    typeIn('Costo general por partida', '7');

    expect(
      await screen.findByText(/vacío = usa el costo general \(7\)/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Duelo')).toHaveAttribute('placeholder', '7');
  });
});
