import { render } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WeeklyTrendChart } from './advanced-stats-charts';

// Humo sobre recharts de verdad, para que una prop inválida reviente acá y no en
// producción. `ResponsiveContainer` se mide con `getBoundingClientRect`, que en jsdom
// siempre da 0 y deja el SVG vacío: se le da un tamaño fijo mientras dura el archivo.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ width: 600, height: 200, top: 0, left: 0, right: 600, bottom: 200, x: 0, y: 0 }) as DOMRect;
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const semanas = [
  { week: '2026-07-06', accuracyPct: 40, total: 30 },
  { week: '2026-07-13', accuracyPct: 55, total: 44 },
  { week: '2026-07-20', accuracyPct: 78, total: 51 },
];

function dibujar(data = semanas) {
  return render(
    <div style={{ height: 200 }}>
      <WeeklyTrendChart data={data} />
    </div>,
  );
}

describe('WeeklyTrendChart', () => {
  it('dibuja el área de evolución', () => {
    const { container } = dibujar();
    expect(container.querySelector('.recharts-area-area')).toBeInTheDocument();
  });

  it('rellena el área con un degradado, no con un plano opaco', () => {
    const { container } = dibujar();
    const degradado = container.querySelector('linearGradient');
    expect(degradado).toBeInTheDocument();
    expect(degradado?.querySelectorAll('stop').length).toBeGreaterThan(1);
  });

  it('destaca solo el punto final, con su valor al lado', () => {
    const { container } = dibujar();
    const finales = container.querySelectorAll('[data-slot="trend-last-point"]');
    expect(finales).toHaveLength(1);
    expect(finales[0]).toHaveTextContent('78%');
  });

  it('no salpica de puntos las semanas intermedias', () => {
    const { container } = dibujar();
    expect(container.querySelectorAll('.recharts-area-dot')).toHaveLength(0);
  });
});
