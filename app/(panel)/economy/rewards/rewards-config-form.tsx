'use client';

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SaveIcon, GiftIcon, PlusIcon, Trash2Icon, TrophyIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRewardsConfig,
  useRewardsMutations,
  REWARD_DEFAULTS,
  RAPIDA_MAX_RANK,
  rapidaBracketsProblem,
  type RapidaPrizeBracket,
  type RewardConfigValues,
} from '@/hooks/use-rewards-config';

// Mismos caps que el backend (anti-typo: este form emite moneda). 0 = no aplica.
const xp = z.number().int().min(0).max(1000);
const kolones = z.number().int().min(0).max(1000);
const kokos = z.number().int().min(0).max(500);
const rank = z.number().int().min(1).max(RAPIDA_MAX_RANK);

const FormSchema = z.object({
  practiceKolonesPerCorrect: kolones,
  practiceKokosPerCorrect: kokos,
  quickKolonesPerCorrect: kolones,
  quickKokosPerCorrect: kokos,
  // El backend exige la matriz COMPLETA (schema .strict()): un campo que no
  // viaje acá rompe el guardado entero, no solo el suyo.
  quickSpeedBonusXp: xp,
  reviveKokosPrice: z.number().int().min(0).max(10000),
  surpriseExamBaseXp: xp,
  surpriseExamWindowFactor: z.number().int().min(1).max(10),
  surpriseExamKolones: kolones,
  surpriseExamKokos: kokos,
  simulacroKolones: kolones,
  simulacroKokos: kokos,
  duelCompletionKolones: kolones,
  duelCompletionKokos: kokos,
  duelWinKolones: kolones,
  duelWinKokos: kokos,
  arenaRapidaPrizes: z
    .array(z.object({ minRank: rank, maxRank: rank, kolones, kokos, xp }))
    .max(RAPIDA_MAX_RANK)
    .superRefine((brackets, ctx) => {
      const problem = rapidaBracketsProblem(brackets);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    }),
  arenaAmigosKolones: kolones,
  arenaAmigosKokos: kokos,
  arenaAmigosXp: xp,
  leagueXpPerCorrect: xp,
  leagueXpSimulacro: xp,
  leagueXpGameMode: xp,
  leagueXpDuelWon: xp,
  goalKolones: kolones,
  goalKokos: kokos,
  goalXp: xp,
  streakKolones: kolones,
  streakKokos: kokos,
  streakLeagueXp: xp,
  kokosPerVideo: kokos,
  kolonesPerVideo: kolones,
  videoXp: xp,
  flashcardSessionXp: xp,
});
type FormValues = z.infer<typeof FormSchema>;
type NumberField = Exclude<keyof FormValues, 'arenaRapidaPrizes'>;
type NumberPath = NumberField | `arenaRapidaPrizes.${number}.${keyof RapidaPrizeBracket}`;

const FIELD_NAMES = Object.keys(FormSchema.shape) as (keyof FormValues)[];
const pick = (data: RewardConfigValues): FormValues =>
  Object.fromEntries(
    FIELD_NAMES.map((k) => [k, data[k] ?? REWARD_DEFAULTS[k]]),
  ) as FormValues;

const NEW_BRACKET = { minRank: 1, maxRank: 1, kolones: 0, kokos: 0, xp: 0 };

// Cada modo tiene su XP + Kolones + Kokos (matriz completa); los XP compartidos entre
// modos (correcta / modo completado) viven en la sección XP para no duplicarlos.
const SECTIONS: { title: string; fields: [NumberField, string][] }[] = [
  {
    title: 'XP (todo XP suma a la liga)',
    fields: [
      ['leagueXpPerCorrect', 'Por respuesta correcta (todos los modos)'],
      ['leagueXpGameMode', 'Por modo de juego completado'],
      ['leagueXpSimulacro', 'Por simulacro completado'],
      ['leagueXpDuelWon', 'Por duelo ganado'],
      ['surpriseExamBaseXp', 'Examen sorpresa: al completar'],
      ['surpriseExamWindowFactor', 'Examen sorpresa: multiplicador en ventana (×)'],
      ['goalXp', 'Meta diaria'],
      ['streakLeagueXp', 'Racha: por día'],
      ['quickSpeedBonusXp', 'Contrarreloj: bonus por correcta en menos de 3 s'],
      ['flashcardSessionXp', 'Material de repaso: sesión diaria de tarjetas completa'],
    ],
  },
  {
    title: 'Práctica normal (por respuesta correcta)',
    fields: [
      ['practiceKolonesPerCorrect', 'Kolones'],
      ['practiceKokosPerCorrect', 'Kokos'],
    ],
  },
  {
    title: 'Modos rápidos (por respuesta correcta)',
    fields: [
      ['quickKolonesPerCorrect', 'Kolones'],
      ['quickKokosPerCorrect', 'Kokos'],
    ],
  },
  {
    title: 'Examen sorpresa (al completar)',
    fields: [
      ['surpriseExamKolones', 'Kolones'],
      ['surpriseExamKokos', 'Kokos'],
    ],
  },
  {
    title: 'Simulacro (al completar)',
    fields: [
      ['simulacroKolones', 'Kolones'],
      ['simulacroKokos', 'Kokos'],
    ],
  },
  {
    title: 'Partida Kodi (duelo)',
    fields: [
      ['duelCompletionKolones', 'Completar: Kolones (ambos jugadores)'],
      ['duelCompletionKokos', 'Completar: Kokos (ambos jugadores)'],
      ['duelWinKolones', 'Ganador: Kolones extra'],
      ['duelWinKokos', 'Ganador: Kokos extra'],
    ],
  },
  {
    title: 'Arena Amigos al ganador (la Especial premia por tramos en su pantalla)',
    fields: [
      ['arenaAmigosKolones', 'Amigos: Kolones'],
      ['arenaAmigosKokos', 'Amigos: Kokos'],
      ['arenaAmigosXp', 'Amigos: XP extra'],
    ],
  },
  {
    title: 'Hábito diario',
    fields: [
      ['goalKolones', 'Meta diaria: Kolones'],
      ['goalKokos', 'Meta diaria: Kokos'],
      ['streakKolones', 'Racha: Kolones por día'],
      ['streakKokos', 'Racha: Kokos por día'],
    ],
  },
  {
    title: 'Videos',
    fields: [
      ['kokosPerVideo', 'Video: Kokos'],
      ['kolonesPerVideo', 'Video: Kolones'],
      ['videoXp', 'Video: XP'],
    ],
  },
  {
    title: 'Modos rápidos — costos',
    fields: [['reviveKokosPrice', 'Supervivencia: Kokos de la segunda oportunidad']],
  },
];

export function RewardsConfigForm({ country }: { country: string | null }) {
  const { data, isLoading, isError } = useRewardsConfig(country);
  const { saveRewards } = useRewardsMutations();
  // `values` resetea el form al cambiar de país (o a defaults si ese país no tiene fila).
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: data ? pick(data) : REWARD_DEFAULTS,
  });
  const brackets = useFieldArray({ control: form.control, name: 'arenaRapidaPrizes' });

  async function onSubmit(v: FormValues): Promise<void> {
    try {
      await saveRewards.mutateAsync({ country, ...v });
      toast.success('Recompensas guardadas');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando recompensas');
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la config de recompensas.</AlertDescription>
      </Alert>
    );

  const num = (name: NumberPath, label: string) => (
    <Controller
      key={name}
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`r-${name}`}>{label}</FieldLabel>
          <Input
            id={`r-${name}`}
            type="number"
            min={0}
            step={1}
            value={Number.isNaN(field.value) ? '' : field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="text-primary size-4" />
          Recompensas por modo
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Cada modo tiene XP, Kolones y Kokos. <strong>0 = ese premio no aplica</strong>;
          poné un monto para activarlo. Todo XP suma a la liga del usuario.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {SECTIONS.map((section, i) => (
              <div key={section.title} className="space-y-3">
                {i > 0 && <Separator />}
                <h3 className="text-sm font-medium">{section.title}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.fields.map(([name, label]) => num(name, label))}
                </div>
              </div>
            ))}

            <Separator />
            {/* Mismo editor que los tramos de la Especial. Sin mínimo de filas:
                sin tramos, la Rápida no paga. */}
            <fieldset
              className="min-w-0 space-y-3"
              aria-labelledby="rapida-tramos"
            >
              <legend id="rapida-tramos" className="flex items-center gap-2 text-sm font-medium">
                <TrophyIcon className="text-primary size-4" />
                Arena Rápida: premios por puesto
              </legend>
              {brackets.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-6">
                  {num(`arenaRapidaPrizes.${i}.minRank`, 'Puesto desde')}
                  {num(`arenaRapidaPrizes.${i}.maxRank`, 'Puesto hasta')}
                  {num(`arenaRapidaPrizes.${i}.kolones`, 'Kolones')}
                  {num(`arenaRapidaPrizes.${i}.kokos`, 'Kokos')}
                  {num(`arenaRapidaPrizes.${i}.xp`, 'XP')}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => brackets.remove(i)}
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
                disabled={brackets.fields.length >= RAPIDA_MAX_RANK}
                onClick={() => brackets.append(NEW_BRACKET)}
              >
                <PlusIcon className="size-4" />
                Agregar tramo
              </Button>
              {form.formState.errors.arenaRapidaPrizes?.root?.message ||
              form.formState.errors.arenaRapidaPrizes?.message ? (
                <FieldError
                  errors={[
                    form.formState.errors.arenaRapidaPrizes.root ??
                      form.formState.errors.arenaRapidaPrizes,
                  ]}
                />
              ) : null}
              <FieldDescription>
                Cada fila paga a los puestos de ese rango (ej.: 1–1, 2–2, 3–3 y 4–{RAPIDA_MAX_RANK}{' '}
                para «el resto»). Los tramos no pueden solaparse. Los bots no cobran, pero ocupan su
                puesto. Sin tramos, la Rápida no paga.
              </FieldDescription>
            </fieldset>
            <div className="flex justify-end">
              <Button type="submit" disabled={saveRewards.isPending}>
                <SaveIcon className="size-4" />
                {saveRewards.isPending ? 'Guardando…' : 'Guardar recompensas'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
