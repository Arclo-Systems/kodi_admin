import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_TIERS,
  achievementTierBadgeClass,
  achievementTierLabel,
} from './achievement-tier';

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

describe('achievementTierBadgeClass', () => {
  // El color lo manda la medalla de la app, no una escalera del panel.
  it.each([
    ['common', 'success'],
    ['uncommon', 'info'],
    ['rare', 'morado'],
    ['epic', 'warning'],
    ['limited', 'cafe'],
  ])('%s usa el token %s de la medalla', (tier, token) => {
    expect(achievementTierBadgeClass(tier)).toBe(
      `border-${token}/40 bg-${token}/15 text-${token}`,
    );
  });

  it('cada rareza tiene un color propio', () => {
    const classes = ACHIEVEMENT_TIERS.map((t) => achievementTierBadgeClass(t.value));
    expect(new Set(classes).size).toBe(ACHIEVEMENT_TIERS.length);
  });

  it('un tier desconocido cae en el gris neutro', () => {
    expect(achievementTierBadgeClass('mythic')).toBe('text-muted-foreground');
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
