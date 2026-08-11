import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_TIERS, achievementTierLabel } from './achievement-tier';

describe('achievementTierLabel', () => {
  it('traduce las cinco rarezas al español', () => {
    expect(achievementTierLabel('common')).toBe('Común');
    expect(achievementTierLabel('uncommon')).toBe('Poco común');
    expect(achievementTierLabel('rare')).toBe('Raro');
    expect(achievementTierLabel('epic')).toBe('Épico');
    expect(achievementTierLabel('limited')).toBe('Edición limitada');
  });

  it('un tier desconocido se muestra crudo en vez de romper', () => {
    expect(achievementTierLabel('mythic')).toBe('mythic');
  });
});

describe('ACHIEVEMENT_TIERS', () => {
  it('ofrece las cinco opciones del selector, de menor a mayor rareza', () => {
    expect(ACHIEVEMENT_TIERS.map((t) => t.value)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'limited',
    ]);
  });
});
