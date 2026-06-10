'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SaveIcon, GiftIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRewardsConfig,
  useRewardsMutations,
  REWARD_DEFAULTS,
  type RewardConfigValues,
} from '@/hooks/use-rewards-config';

// Mismos caps que el backend (anti-typo: este form emite moneda). 0 = no aplica.
const xp = z.number().int().min(0).max(1000);
const kolones = z.number().int().min(0).max(1000);
const kokos = z.number().int().min(0).max(500);

const FormSchema = z.object({
  practiceKolonesPerCorrect: kolones,
  practiceKokosPerCorrect: kokos,
  quickKolonesPerCorrect: kolones,
  quickKokosPerCorrect: kokos,
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
  arenaRapidaKolones: kolones,
  arenaRapidaKokos: kokos,
  arenaRapidaXp: xp,
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
  achievementKolones: kolones,
  achievementXp: xp,
  kokosPerVideo: kokos,
  kolonesPerVideo: kolones,
  videoXp: xp,
});
type FormValues = z.infer<typeof FormSchema>;

const FIELD_NAMES = Object.keys(FormSchema.shape) as (keyof FormValues)[];
const pick = (data: RewardConfigValues): FormValues =>
  Object.fromEntries(FIELD_NAMES.map((k) => [k, data[k]])) as FormValues;

// Cada modo tiene su XP + Kolones + Kokos (matriz completa); los XP compartidos entre
// modos (correcta / modo completado) viven en la sección XP para no duplicarlos.
const SECTIONS: { title: string; fields: [keyof FormValues, string][] }[] = [
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
    title: 'Arena al ganador (la Especial premia por tramos en su pantalla)',
    fields: [
      ['arenaRapidaKolones', 'Rápida: Kolones'],
      ['arenaRapidaKokos', 'Rápida: Kokos'],
      ['arenaRapidaXp', 'Rápida: XP extra'],
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
    title: 'Logros y videos',
    fields: [
      ['achievementKolones', 'Logro: Kolones (los Kokos van por logro)'],
      ['achievementXp', 'Logro: XP'],
      ['kokosPerVideo', 'Video: Kokos'],
      ['kolonesPerVideo', 'Video: Kolones'],
      ['videoXp', 'Video: XP'],
    ],
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

  const num = (name: keyof FormValues, label: string) => (
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
