'use client';

import {
  COUNTER_FIELDS,
  COUNT_ENTITIES,
  LEAGUE_LEVELS,
  type AchievementCondition,
  type ConditionType,
  type CounterField,
  type CountEntity,
  type LeagueLevel,
} from '@/hooks/use-achievements';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_LABELS: Record<ConditionType, string> = {
  counter_gte: 'Contador acumulado ≥ valor',
  count_gte: 'Conteo de entidad ≥ valor',
  event_once: 'Evento (una sola vez)',
  combo_reached: 'Combo alcanzado',
  league_reached: 'Liga alcanzada',
  manual: 'Manual (otorgado a mano)',
};

const COUNTER_LABELS: Record<CounterField, string> = {
  streak_days: 'Días de racha',
  goal_streak_days: 'Días de meta cumplida',
};

const ENTITY_LABELS: Record<CountEntity, string> = {
  correct_answers: 'Respuestas correctas',
  simulacros_completed: 'Simulacros completados',
  practice_sessions_completed: 'Sesiones de práctica',
  quick_sessions_completed: 'Sesiones rápidas',
  duels_won: 'Duelos ganados',
  arenas_won: 'Arenas ganadas',
  videos_watched: 'Videos vistos',
};

const LEVEL_LABELS: Record<LeagueLevel, string> = {
  aprendiz: 'Aprendiz',
  avanzado: 'Avanzado',
  experto: 'Experto',
  genio: 'Genio',
};

export function defaultCondition(type: ConditionType): AchievementCondition {
  switch (type) {
    case 'counter_gte':
      return { type, field: 'streak_days', value: 1 };
    case 'count_gte':
      return { type, entity: 'correct_answers', value: 1 };
    case 'event_once':
      return { type, event: '' };
    case 'combo_reached':
      return { type, value: 1 };
    case 'league_reached':
      return { type, level: 'aprendiz' };
    case 'manual':
      return { type };
  }
}

function ValueField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor="cond-value">Valor mínimo</FieldLabel>
      <Input
        id="cond-value"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? 1 : Number(e.target.value))}
      />
    </Field>
  );
}

export function ConditionBuilder({
  value,
  onChange,
}: {
  value: AchievementCondition;
  onChange: (c: AchievementCondition) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Field>
        <FieldLabel>Tipo de condición</FieldLabel>
        <Select
          value={value.type}
          onValueChange={(t) => onChange(defaultCondition(t as ConditionType))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as ConditionType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Cómo el motor desbloquea el logro.</FieldDescription>
      </Field>

      {value.type === 'counter_gte' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>Contador</FieldLabel>
            <Select
              value={value.field}
              onValueChange={(f) => onChange({ ...value, field: f as CounterField })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTER_FIELDS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {COUNTER_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <ValueField value={value.value} onChange={(n) => onChange({ ...value, value: n })} />
        </div>
      )}

      {value.type === 'count_gte' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>Entidad</FieldLabel>
            <Select
              value={value.entity}
              onValueChange={(en) => onChange({ ...value, entity: en as CountEntity })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_ENTITIES.map((en) => (
                  <SelectItem key={en} value={en}>
                    {ENTITY_LABELS[en]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <ValueField value={value.value} onChange={(n) => onChange({ ...value, value: n })} />
        </div>
      )}

      {value.type === 'event_once' && (
        <Field>
          <FieldLabel htmlFor="cond-event">Nombre del evento</FieldLabel>
          <Input
            id="cond-event"
            maxLength={80}
            value={value.event}
            onChange={(e) => onChange({ ...value, event: e.target.value })}
            placeholder="ej. first_simulacro_passed"
          />
        </Field>
      )}

      {value.type === 'combo_reached' && (
        <ValueField value={value.value} onChange={(n) => onChange({ ...value, value: n })} />
      )}

      {value.type === 'league_reached' && (
        <Field>
          <FieldLabel>Liga</FieldLabel>
          <Select
            value={value.level}
            onValueChange={(l) => onChange({ ...value, level: l as LeagueLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAGUE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {value.type === 'manual' && (
        <p className="text-muted-foreground text-sm">
          Sin condición automática: el logro se otorga manualmente.
        </p>
      )}
    </div>
  );
}

export function describeCondition(c: AchievementCondition): string {
  switch (c.type) {
    case 'counter_gte':
      return `${COUNTER_LABELS[c.field]} ≥ ${c.value}`;
    case 'count_gte':
      return `${ENTITY_LABELS[c.entity]} ≥ ${c.value}`;
    case 'event_once':
      return `Evento «${c.event}» (una vez)`;
    case 'combo_reached':
      return `Combo ≥ ${c.value}`;
    case 'league_reached':
      return `Llega a liga ${LEVEL_LABELS[c.level]}`;
    case 'manual':
      return 'Manual';
  }
}
