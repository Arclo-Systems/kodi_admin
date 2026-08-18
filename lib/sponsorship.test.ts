import { describe, expect, it } from 'vitest';
import {
  sponsorshipRangeLabel,
  sponsorshipState,
  type SponsorshipWindow,
} from './sponsorship';

const NOW = new Date('2026-06-15T12:00:00.000Z');

function window(over: Partial<SponsorshipWindow> = {}): SponsorshipWindow {
  return { isSponsored: true, sponsoredFrom: null, sponsoredUntil: null, ...over };
}

describe('vigencia del patrocinio', () => {
  it('sin patrocinio no mira fechas', () => {
    expect(
      sponsorshipState(
        window({ isSponsored: false, sponsoredFrom: '2026-01-01T00:00:00.000Z' }),
        NOW,
      ),
    ).toBe('none');
  });

  it('patrocinio sin fechas está vigente', () => {
    expect(sponsorshipState(window(), NOW)).toBe('active');
  });

  it('antes del inicio queda programado', () => {
    expect(sponsorshipState(window({ sponsoredFrom: '2026-07-01T00:00:00.000Z' }), NOW)).toBe(
      'scheduled',
    );
  });

  it('después del fin queda vencido', () => {
    expect(sponsorshipState(window({ sponsoredUntil: '2026-06-01T00:00:00.000Z' }), NOW)).toBe(
      'expired',
    );
  });

  it('dentro de la ventana está vigente', () => {
    expect(
      sponsorshipState(
        window({
          sponsoredFrom: '2026-06-01T00:00:00.000Z',
          sponsoredUntil: '2026-06-30T23:59:59.000Z',
        }),
        NOW,
      ),
    ).toBe('active');
  });

  it('los bordes de la ventana cuentan como vigentes', () => {
    const at = '2026-06-15T12:00:00.000Z';
    expect(sponsorshipState(window({ sponsoredFrom: at }), NOW)).toBe('active');
    expect(sponsorshipState(window({ sponsoredUntil: at }), NOW)).toBe('active');
  });

  it('una fecha ilegible no vence el patrocinio', () => {
    expect(sponsorshipState(window({ sponsoredUntil: 'no-es-fecha' }), NOW)).toBe('active');
  });
});

describe('rótulo de vigencia', () => {
  it('sin fechas no rotula nada', () => {
    expect(sponsorshipRangeLabel(window())).toBeNull();
  });

  it('con una sola fecha usa desde/hasta', () => {
    expect(sponsorshipRangeLabel(window({ sponsoredFrom: '2026-03-15T06:00:00.000Z' }))).toMatch(
      /^desde /,
    );
    expect(sponsorshipRangeLabel(window({ sponsoredUntil: '2026-03-15T06:00:00.000Z' }))).toMatch(
      /^hasta /,
    );
  });

  it('con las dos fechas usa la flecha', () => {
    const label = sponsorshipRangeLabel(
      window({
        sponsoredFrom: '2026-03-15T06:00:00.000Z',
        sponsoredUntil: '2026-06-30T06:00:00.000Z',
      }),
    );
    expect(label).toContain('→');
  });
});
