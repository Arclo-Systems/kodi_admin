import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdvancedStatsCard, type UserAdvancedStats } from './advanced-stats-card';

// recharts mide con el DOM real: en jsdom no dibuja nada útil y tarda. Se corta en el
// borde perezoso — lo que se prueba acá es qué decide mostrar la grilla, no el SVG.
vi.mock('./advanced-stats-charts-lazy', () => ({
  WeeklyTrendChart: () => <div data-testid="chart-evolucion" />,
}));

function advancedStats(over: Partial<UserAdvancedStats> = {}): UserAdvancedStats {
  return {
    masteryBySubject: [
      { subject: 'Matemática', accuracyPct: 72, topics: 6 },
      { subject: 'Español', accuracyPct: 33, topics: 5 },
    ],
    simulacroAvgScore: 61,
    simulacrosCompleted: 4,
    weakestTopics: [
      { topic: 'Fracciones', subject: 'Matemática', accuracyPct: 21 },
      { topic: 'Relaciones y Álgebra', subject: 'Matemática', accuracyPct: 28 },
      { topic: 'Sintaxis', subject: 'Español', accuracyPct: 35 },
    ],
    weeklyAccuracy: [
      { week: '2026-07-06', accuracyPct: 40, total: 30 },
      { week: '2026-07-13', accuracyPct: 55, total: 44 },
      { week: '2026-07-20', accuracyPct: 61, total: 51 },
    ],
    ...over,
  };
}

const tracks = (el: HTMLElement) => el.querySelectorAll('[data-slot="measure-track"]');
const fills = (el: HTMLElement) => [...el.querySelectorAll('[data-slot="measure-fill"]')];

describe('AdvancedStatsCard', () => {
  it('sin datos no renderiza nada', () => {
    const { container } = render(<AdvancedStatsCard advanced={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con el payload vacío tampoco renderiza', () => {
    const { container } = render(
      <AdvancedStatsCard
        advanced={advancedStats({
          masteryBySubject: [],
          weakestTopics: [],
          weeklyAccuracy: [],
          simulacrosCompleted: 0,
          simulacroAvgScore: null,
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('arma una card por bloque bajo un solo título de sección', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Estadísticas avanzadas' }),
    ).toBeInTheDocument();
    for (const nombre of ['Aciertos por materia', 'Dónde se traba', 'Evolución semanal']) {
      expect(screen.getByRole('heading', { level: 3, name: nombre })).toBeInTheDocument();
    }
  });

  it('el resumen da los cuatro datos de la franja', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    const dato = (label: string) => screen.getByText(label).nextElementSibling;
    expect(dato('Simulacros completados')).toHaveTextContent('4');
    expect(dato('Promedio de simulacros')).toHaveTextContent('61 / 100');
    expect(dato('Semanas con práctica')).toHaveTextContent('3 de 8');
    expect(dato('Materias practicadas')).toHaveTextContent('2');
  });

  it('sin simulacros el promedio lo dice con palabras, no con un guion suelto', () => {
    render(
      <AdvancedStatsCard
        advanced={advancedStats({ simulacroAvgScore: null, simulacrosCompleted: 0 })}
      />,
    );
    expect(screen.getByText('Sin simulacros')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('cada medida se dibuja sobre un carril y la barra se llena a su porcentaje', () => {
    const { container } = render(<AdvancedStatsCard advanced={advancedStats()} />);
    // 2 materias + 3 temas flojos.
    expect(tracks(container)).toHaveLength(5);
    const anchos = fills(container).map((f) => (f as HTMLElement).style.width);
    expect(anchos).toEqual(['72%', '33%', '21%', '28%', '35%']);
    for (const fill of fills(container)) {
      expect(fill.parentElement).toHaveAttribute('data-slot', 'measure-track');
    }
  });

  it('un 0% deja una astilla visible en vez de desaparecer', () => {
    const { container } = render(
      <AdvancedStatsCard
        advanced={advancedStats({
          masteryBySubject: [{ subject: 'Ciencias', accuracyPct: 0, topics: 4 }],
        })}
      />,
    );
    expect((fills(container)[0] as HTMLElement).style.width).toBe('1.5%');
  });

  it('ningún rótulo de la fila depende de envolverse', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    const nombre = screen.getByTitle('Matemática');
    expect(nombre).toHaveClass('truncate');
    expect(screen.getByText('72%')).toHaveClass('tabular-nums');
    expect(screen.getByText('6 temas')).toHaveClass('whitespace-nowrap');
  });

  it('marca la muestra chica: rayada, apagada y explicada en la leyenda', () => {
    const { container } = render(
      <AdvancedStatsCard
        advanced={advancedStats({
          masteryBySubject: [{ subject: 'Ciencias', accuracyPct: 100, topics: 2 }],
        })}
      />,
    );
    expect(fills(container)[0]).toHaveClass('opacity-[0.55]');
    expect(screen.getByText('Menos de 3 temas: dato todavía flojo')).toBeInTheDocument();
    // El rayado es visual: quien usa lector de pantalla necesita la misma advertencia.
    expect(screen.getByText(/muestra chica/i)).toBeInTheDocument();
  });

  it('con respaldo suficiente no marca nada ni ensucia la leyenda', () => {
    const { container } = render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(fills(container)[0]).not.toHaveClass('opacity-[0.55]');
    expect(screen.queryByText('Menos de 3 temas: dato todavía flojo')).not.toBeInTheDocument();
    expect(screen.queryByText(/muestra chica/i)).not.toBeInTheDocument();
  });

  it('nombra la materia a la que pertenece cada tema flojo', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(screen.getByText('3 temas de menor acierto')).toBeInTheDocument();
    const item = screen.getByText('Fracciones').closest('li');
    expect(item).toHaveTextContent('21%');
    expect(item).toHaveTextContent('Matemática');
  });

  it('con 3 semanas o más dibuja la evolución', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(screen.getByTestId('chart-evolucion')).toBeInTheDocument();
    expect(screen.getByText('últimas 8 semanas')).toBeInTheDocument();
  });

  it('con una sola semana la card se encoge a una línea y dice cuántas faltan', () => {
    const { container } = render(
      <AdvancedStatsCard
        advanced={advancedStats({
          weeklyAccuracy: [{ week: '2026-07-20', accuracyPct: 35, total: 12 }],
        })}
      />,
    );
    // La card sigue existiendo: no desaparece ni reserva un hueco vacío.
    expect(screen.getByRole('heading', { level: 3, name: 'Evolución semanal' })).toBeInTheDocument();
    expect(screen.queryByTestId('chart-evolucion')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="trend-hint"]')).toHaveTextContent(
      'Solo hay 1 semana con práctica. La línea aparece a partir de 3.',
    );
  });

  it('sin materias lo dice y no dibuja filas de materia', () => {
    const { container } = render(
      <AdvancedStatsCard advanced={advancedStats({ masteryBySubject: [] })} />,
    );
    expect(screen.getByText('Sin datos de práctica todavía.')).toBeInTheDocument();
    // Solo quedan los carriles de los temas flojos.
    expect(tracks(container)).toHaveLength(3);
  });
});
