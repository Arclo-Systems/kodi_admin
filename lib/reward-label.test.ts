import { describe, expect, it } from 'vitest';
import { rewardLabel } from './reward-label';

describe('rewardLabel', () => {
  it('lista las tres monedas en orden XP · Kokos · Kolones', () => {
    expect(rewardLabel({ xpReward: 250, kokosReward: 300, kolonesReward: 250 })).toBe(
      '250 XP · 300 Kokos · 250 Kolones',
    );
  });

  it('omite los premios en cero', () => {
    expect(rewardLabel({ xpReward: 0, kokosReward: 25, kolonesReward: 0 })).toBe('25 Kokos');
    expect(rewardLabel({ xpReward: 60, kokosReward: 0, kolonesReward: 0 })).toBe('60 XP');
  });

  // Fundador no paga nada: el precio de por vida ES el premio.
  it('un premio de puro honor muestra un guion, no tres ceros', () => {
    expect(rewardLabel({ xpReward: 0, kokosReward: 0, kolonesReward: 0 })).toBe('—');
  });

  // Se compara contra el mismo formateador (el separador de es-CR depende del ICU del runtime).
  it('agrupa los miles con el formato es-CR', () => {
    const label = rewardLabel({ xpReward: 0, kokosReward: 0, kolonesReward: 10_000 });
    expect(label).toBe(`${(10_000).toLocaleString('es-CR')} Kolones`);
    expect(label).not.toBe('10000 Kolones');
  });
});
