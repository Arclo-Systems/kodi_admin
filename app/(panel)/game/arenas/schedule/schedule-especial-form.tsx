'use client';

import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { AwardIcon, CalendarClockIcon, CalendarPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { useModulesTree } from '@/hooks/use-modules-tree';
import {
  hasOverlap,
  useScheduleEspecial,
  PRIZE_CAPS,
  MAX_BRACKETS,
  type PrizeBracketInput,
} from '@/hooks/use-arena-especial';

type Bracket = {
  minRank: number;
  maxRank: number;
  kolones: number;
  kokos: number;
  xp: number;
};

type FormValues = {
  country: string;
  moduleId: string;
  scheduledAt: string;
  prizes: Bracket[];
};

const FIRST_BRACKET: Bracket = {
  minRank: 1,
  maxRank: 1,
  kolones: 150,
  kokos: 100,
  xp: 50,
};

function toSnake(b: Bracket): PrizeBracketInput {
  return {
    min_rank: b.minRank,
    max_rank: b.maxRank,
    kolones: b.kolones,
    kokos: b.kokos,
    xp: b.xp,
  };
}

function validate(v: FormValues): string | null {
  if (!v.moduleId) return 'Elegí un módulo';
  if (!v.scheduledAt || new Date(v.scheduledAt) <= new Date())
    return 'La fecha/hora debe ser futura';
  if (v.prizes.length === 0) return 'Agregá al menos un tramo de premio';
  for (const b of v.prizes) {
    if (b.minRank < 1 || b.maxRank < b.minRank)
      return 'Cada tramo necesita min ≥ 1 y max ≥ min';
    if (b.kolones > PRIZE_CAPS.kolones || b.kokos > PRIZE_CAPS.kokos || b.xp > PRIZE_CAPS.xp)
      return `Montos máximos: ${PRIZE_CAPS.kolones} Kolones · ${PRIZE_CAPS.kokos} Kokos · ${PRIZE_CAPS.xp} XP`;
  }
  if (hasOverlap(v.prizes.map(toSnake))) return 'Los tramos no pueden solaparse';
  return null;
}

export function ScheduleEspecialForm() {
  const router = useRouter();
  const schedule = useScheduleEspecial();
  const form = useForm<FormValues>({
    defaultValues: {
      country: COUNTRIES[0]?.code ?? 'CR',
      moduleId: '',
      scheduledAt: '',
      prizes: [FIRST_BRACKET],
    },
  });
  const country = useWatch({ control: form.control, name: 'country' });
  const { data: tree } = useModulesTree(country);
  const modules = tree ?? [];
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'prizes',
  });

  async function submit(v: FormValues): Promise<void> {
    const error = validate(v);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await schedule.mutateAsync({
        module_id: v.moduleId,
        scheduled_at: new Date(v.scheduledAt).toISOString(),
        prizes: v.prizes.map(toSnake),
      });
      toast.success('Evento de Arena Especial programado');
      router.push('/game');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error programando el evento');
    }
  }

  const numField = (
    name: `prizes.${number}.${keyof Bracket}`,
    label: string,
    min: number,
  ) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <Field>
          <FieldLabel className="text-xs">{label}</FieldLabel>
          <Input
            type="number"
            min={min}
            value={field.value}
            onChange={(e) =>
              field.onChange(e.target.value === '' ? min : Number(e.target.value))
            }
          />
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <fieldset className="min-w-0 space-y-4">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <CalendarClockIcon className="text-primary size-4" />
              Cuándo y dónde
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>País</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('moduleId', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} · {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Módulo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí un módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
            <Controller
              name="scheduledAt"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="ae-when">Fecha y hora</FieldLabel>
                  <DateTimePicker id="ae-when" value={field.value} onChange={field.onChange} />
                  <FieldDescription>Cuándo arranca el evento (debe ser futura).</FieldDescription>
                </Field>
              )}
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <AwardIcon className="text-primary size-4" />
              Premios por tramo de puesto
            </legend>
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-6">
                {numField(`prizes.${i}.minRank`, 'Puesto desde', 1)}
                {numField(`prizes.${i}.maxRank`, 'Puesto hasta', 1)}
                {numField(`prizes.${i}.kolones`, 'Kolones', 0)}
                {numField(`prizes.${i}.kokos`, 'Kokos', 0)}
                {numField(`prizes.${i}.xp`, 'XP', 0)}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={fields.length <= 1}
                >
                  <Trash2Icon className="size-4" />
                  Quitar
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= MAX_BRACKETS}
              onClick={() => append({ minRank: 1, maxRank: 1, kolones: 0, kokos: 0, xp: 0 })}
            >
              <PlusIcon className="size-4" />
              Agregar tramo
            </Button>
            <FieldDescription>
              Los tramos no pueden solaparse. Máx. {MAX_BRACKETS} tramos · topes {PRIZE_CAPS.kolones}{' '}
              Kolones / {PRIZE_CAPS.kokos} Kokos / {PRIZE_CAPS.xp} XP.
            </FieldDescription>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/game')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <CalendarPlusIcon className="size-4" />
              {form.formState.isSubmitting ? 'Programando…' : 'Programar evento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
