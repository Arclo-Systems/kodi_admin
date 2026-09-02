import { render } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SubjectAccuracyChart, WeeklyTrendChart, subjectBarLabel } from './advanced-stats-charts';

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

describe('gráficos de estadísticas avanzadas', () => {
  it('dibuja las barras por materia', () => {
    const { container } = render(
      <div style={{ height: 200 }}>
        <SubjectAccuracyChart
          data={[
            { subject: 'Matemática', accuracyPct: 72, topics: 6 },
            { subject: 'Español', accuracyPct: 33, topics: 1 },
          ]}
        />
      </div>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
  });

  it('rotula la barra con el porcentaje y los temas que lo respaldan', () => {
    expect(subjectBarLabel({ subject: 'Español', accuracyPct: 33, topics: 1 })).toBe(
      '33% · 1 tema',
    );
    expect(subjectBarLabel({ subject: 'Matemática', accuracyPct: 72, topics: 6 })).toBe(
      '72% · 6 temas',
    );
  });

  it('pinta cada barra con el tono de su desempeño, no todas iguales', () => {
    const { container } = render(
      <div style={{ height: 200 }}>
        <SubjectAccuracyChart
          data={[
            { subject: 'Matemática', accuracyPct: 72, topics: 6 },
            { subject: 'Estudios', accuracyPct: 55, topics: 4 },
            { subject: 'Español', accuracyPct: 33, topics: 5 },
          ]}
        />
      </div>,
    );
    const fills = [...container.querySelectorAll('.recharts-bar-rectangle path')].map((p) =>
      p.getAttribute('fill'),
    );
    expect(fills).toEqual([
      'var(--color-solid)',
      'var(--color-partial)',
      'var(--color-weak)',
    ]);
  });

  it('dibuja el área de evolución con un punto por semana', () => {
    const { container } = render(
      <div style={{ height: 200 }}>
        <WeeklyTrendChart
          data={[
            { week: '2026-07-06', accuracyPct: 40, total: 30 },
            { week: '2026-07-13', accuracyPct: 55, total: 44 },
            { week: '2026-07-20', accuracyPct: 61, total: 51 },
          ]}
        />
      </div>,
    );
    expect(container.querySelector('.recharts-area-area')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-area-dot')).toHaveLength(3);
  });
});
