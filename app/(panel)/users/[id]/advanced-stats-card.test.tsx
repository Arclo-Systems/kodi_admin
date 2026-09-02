import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdvancedStatsCard, type UserAdvancedStats } from './advanced-stats-card';

// recharts mide con el DOM real: en jsdom no dibuja nada útil y tarda. Se corta en el
// borde perezoso — lo que se prueba acá es qué decide mostrar la card, no el SVG.
vi.mock('./advanced-stats-charts-lazy', () => ({
  SubjectAccuracyChart: () => <div data-testid="chart-materias" />,
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
    weakestTopics: [{ topic: 'Fracciones', accuracyPct: 21 }],
    weeklyAccuracy: [
      { week: '2026-07-06', accuracyPct: 40, total: 30 },
      { week: '2026-07-13', accuracyPct: 55, total: 44 },
      { week: '2026-07-20', accuracyPct: 61, total: 51 },
    ],
    ...over,
  };
}

describe('AdvancedStatsCard', () => {
  it('sin datos no renderiza la card', () => {
    const { container } = render(<AdvancedStatsCard advanced={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dibuja los dos gráficos cuando hay materias y semanas suficientes', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(screen.getByTestId('chart-materias')).toBeInTheDocument();
    expect(screen.getByTestId('chart-evolucion')).toBeInTheDocument();
  });

  it('da el porcentaje y los temas que lo respaldan como texto, no solo en la barra', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    const fila = screen.getByRole('row', { name: /Matemática/ });
    expect(fila).toHaveTextContent('72%');
    expect(fila).toHaveTextContent('6 temas');
  });

  it('avisa del sesgo cuando una materia se apoya en menos de 3 temas', () => {
    render(
      <AdvancedStatsCard
        advanced={advancedStats({
          masteryBySubject: [{ subject: 'Ciencias', accuracyPct: 100, topics: 2 }],
        })}
      />,
    );
    expect(screen.getByText(/menos de 3 temas/i)).toBeInTheDocument();
  });

  it('no avisa del sesgo si todas las materias tienen respaldo suficiente', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(screen.queryByText(/menos de 3 temas/i)).not.toBeInTheDocument();
  });

  it('con una sola semana no dibuja la evolución: dice cuántas faltan', () => {
    render(
      <AdvancedStatsCard
        advanced={advancedStats({
          weeklyAccuracy: [{ week: '2026-07-20', accuracyPct: 35, total: 12 }],
        })}
      />,
    );
    expect(screen.queryByTestId('chart-evolucion')).not.toBeInTheDocument();
    expect(screen.getByText(/1 semana con práctica/i)).toBeInTheDocument();
    expect(screen.getByText(/a partir de 3/i)).toBeInTheDocument();
  });

  it('sin materias no dibuja barras: lo dice', () => {
    render(<AdvancedStatsCard advanced={advancedStats({ masteryBySubject: [] })} />);
    expect(screen.queryByTestId('chart-materias')).not.toBeInTheDocument();
    expect(screen.getByText('Sin datos de práctica todavía.')).toBeInTheDocument();
  });

  it('mantiene los datos de simulacros y los temas a mejorar', () => {
    render(<AdvancedStatsCard advanced={advancedStats()} />);
    expect(screen.getByText('61 / 100')).toBeInTheDocument();
    expect(screen.getByText('Fracciones')).toBeInTheDocument();
    expect(screen.getByText('21%')).toBeInTheDocument();
  });
});
