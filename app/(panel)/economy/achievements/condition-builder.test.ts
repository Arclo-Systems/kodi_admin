import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_EVENTS,
  COUNTER_FIELDS,
  COUNT_ENTITIES,
  LEAGUE_LEVELS,
  type AchievementCondition,
} from '@/hooks/use-achievements';
import { describeCondition } from './condition-builder';

// Catálogo REAL de producción (30 logros, auditoría 2026-08-17 — ver
// ../../../../docs/plans/2026-08-17-auditoria-logros.md). Se copia acá porque
// vive en el backend: si el backend agrega una métrica que el panel no conoce,
// este test la caza antes de que el founder vea "undefined ≥ 28" en la lista.
const CATALOGO: [code: string, condition: AchievementCondition][] = [
  ['arena_10_wins', { type: 'count_gte', entity: 'arenas_won', value: 10 }],
  ['arena_first_win', { type: 'count_gte', entity: 'arenas_won', value: 1 }],
  ['combo_10', { type: 'combo_reached', value: 10 }],
  ['combo_15', { type: 'combo_reached', value: 15 }],
  ['combo_20', { type: 'combo_reached', value: 20 }],
  ['combo_5', { type: 'combo_reached', value: 5 }],
  ['correct_answers_100', { type: 'count_gte', entity: 'correct_answers', value: 100 }],
  ['correct_answers_250', { type: 'count_gte', entity: 'correct_answers', value: 250 }],
  ['correct_answers_50', { type: 'count_gte', entity: 'correct_answers', value: 50 }],
  ['correct_answers_500', { type: 'count_gte', entity: 'correct_answers', value: 500 }],
  ['duels_10', { type: 'count_gte', entity: 'duels_won', value: 10 }],
  ['duels_20', { type: 'count_gte', entity: 'duels_won', value: 20 }],
  ['duels_30', { type: 'count_gte', entity: 'duels_won', value: 30 }],
  ['duels_40', { type: 'count_gte', entity: 'duels_won', value: 40 }],
  ['first_practice_session', { type: 'event_once', event: 'practice_session_completed' }],
  ['first_quick_session', { type: 'event_once', event: 'game_mode_completed' }],
  ['fundador', { type: 'event_once', event: 'founder_offer_claimed' }],
  ['goal_streak_14', { type: 'counter_gte', field: 'goal_met_streak_days', value: 14 }],
  ['goal_streak_21', { type: 'counter_gte', field: 'goal_met_streak_days', value: 21 }],
  ['goal_streak_28', { type: 'counter_gte', field: 'goal_met_streak_days', value: 28 }],
  ['goal_streak_7', { type: 'counter_gte', field: 'goal_met_streak_days', value: 7 }],
  ['ia', { type: 'event_once', event: 'ai_explain_used' }],
  ['simulacros_1', { type: 'count_gte', entity: 'simulacros_completed', value: 1 }],
  ['simulacros_10', { type: 'count_gte', entity: 'simulacros_completed', value: 10 }],
  ['simulacros_20', { type: 'count_gte', entity: 'simulacros_completed', value: 20 }],
  ['simulacros_5', { type: 'count_gte', entity: 'simulacros_completed', value: 5 }],
  ['streak_100', { type: 'counter_gte', field: 'streak_days', value: 100 }],
  ['streak_3', { type: 'counter_gte', field: 'streak_days', value: 3 }],
  ['streak_30', { type: 'counter_gte', field: 'streak_days', value: 30 }],
  ['streak_7', { type: 'counter_gte', field: 'streak_days', value: 7 }],
];

describe('describeCondition — catálogo de producción', () => {
  it('el catálogo de referencia son los 30 logros del diseño', () => {
    expect(CATALOGO).toHaveLength(30);
  });

  it.each(CATALOGO)('%s se describe sin métricas sin etiqueta', (_code, condition) => {
    const text = describeCondition(condition);
    expect(text).not.toContain('undefined');
    // Una métrica sin etiqueta cae al fallback y deja el snake_case crudo a la vista.
    expect(text).not.toMatch(/[a-z]+_[a-z]/);
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('describeCondition — toda métrica seleccionable tiene etiqueta', () => {
  const todas: AchievementCondition[] = [
    ...COUNTER_FIELDS.map((field) => ({ type: 'counter_gte' as const, field, value: 7 })),
    ...COUNT_ENTITIES.map((entity) => ({ type: 'count_gte' as const, entity, value: 7 })),
    ...ACHIEVEMENT_EVENTS.map((event) => ({ type: 'event_once' as const, event })),
    ...LEAGUE_LEVELS.map((level) => ({ type: 'league_reached' as const, level })),
    { type: 'combo_reached', value: 7 },
    { type: 'manual' },
  ];

  it.each(todas.map((c) => [JSON.stringify(c), c] as const))(
    '%s se describe en español',
    (_label, condition) => {
      const text = describeCondition(condition);
      expect(text).not.toContain('undefined');
      expect(text).not.toMatch(/[a-z]+_[a-z]/);
    },
  );
});

describe('describeCondition — filas viejas', () => {
  // El catálogo lo edita el founder y la BD puede traer una métrica retirada
  // (`videos_watched` salió del enum del backend): se muestra cruda, nunca rota.
  it('una métrica desconocida se muestra cruda en vez de undefined', () => {
    const vieja = {
      type: 'count_gte',
      entity: 'videos_watched',
      value: 10,
    } as unknown as AchievementCondition;

    expect(describeCondition(vieja)).toBe('videos_watched ≥ 10');
  });
});
