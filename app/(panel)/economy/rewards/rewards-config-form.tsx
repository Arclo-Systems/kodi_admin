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

// Mismos caps que el backend (anti-typo: este form emite moneda).
const xp = z.number().int().min(0).max(1000);
const kolones = z.number().int().min(0).max(1000);
const kokos = z.number().int().min(0).max(500);

const FormSchema = z.object({
  practiceXpPerCorrect: xp,
  practiceKolonesPerCorrect: kolones,
  quickXpPerCorrect: xp,
  quickKolonesPerCorrect: kolones,
  surpriseExamBaseXp: xp,
  surpriseExamWindowFactor: z.number().int().min(1).max(10),
  surpriseExamKolones: kolones,
  simulacroKolones: kolones,
  duelCompletionKolones: kolones,
  duelWinKolones: kolones,
  arenaRapidaKolones: kolones,
  arenaRapidaKokos: kokos,
  arenaAmigosKolones: kolones,
  arenaAmigosKokos: kokos,
  leagueXpPerCorrect: xp,
  leagueXpSimulacro: xp,
  leagueXpGameMode: xp,
  leagueXpDuelWon: xp,
  goalKolones: kolones,
  goalXp: xp,
  goalLeagueXp: xp,
  streakKolones: kolones,
  streakLeagueXp: xp,
  achievementKolones: kolones,
  kokosPerVideo: kokos,
});
type FormValues = z.infer<typeof FormSchema>;

const pick = (data: RewardConfigValues): FormValues => ({
  practiceXpPerCorrect: data.practiceXpPerCorrect,
  practiceKolonesPerCorrect: data.practiceKolonesPerCorrect,
  quickXpPerCorrect: data.quickXpPerCorrect,
  quickKolonesPerCorrect: data.quickKolonesPerCorrect,
  surpriseExamBaseXp: data.surpriseExamBaseXp,
  surpriseExamWindowFactor: data.surpriseExamWindowFactor,
  surpriseExamKolones: data.surpriseExamKolones,
  simulacroKolones: data.simulacroKolones,
  duelCompletionKolones: data.duelCompletionKolones,
  duelWinKolones: data.duelWinKolones,
  arenaRapidaKolones: data.arenaRapidaKolones,
  arenaRapidaKokos: data.arenaRapidaKokos,
  arenaAmigosKolones: data.arenaAmigosKolones,
  arenaAmigosKokos: data.arenaAmigosKokos,
  leagueXpPerCorrect: data.leagueXpPerCorrect,
  leagueXpSimulacro: data.leagueXpSimulacro,
  leagueXpGameMode: data.leagueXpGameMode,
  leagueXpDuelWon: data.leagueXpDuelWon,
  goalKolones: data.goalKolones,
  goalXp: data.goalXp,
  goalLeagueXp: data.goalLeagueXp,
  streakKolones: data.streakKolones,
  streakLeagueXp: data.streakLeagueXp,
  achievementKolones: data.achievementKolones,
  kokosPerVideo: data.kokosPerVideo,
});

const SECTIONS: { title: string; fields: [keyof FormValues, string][] }[] = [
  {
    title: 'Práctica normal',
    fields: [
      ['practiceXpPerCorrect', 'XP por correcta'],
      ['practiceKolonesPerCorrect', 'Kolones por correcta'],
    ],
  },
  {
    title: 'Modos rápidos (contrarreloj / supervivencia)',
    fields: [
      ['quickXpPerCorrect', 'XP por correcta'],
      ['quickKolonesPerCorrect', 'Kolones por correcta'],
    ],
  },
  {
    title: 'Examen sorpresa',
    fields: [
      ['surpriseExamBaseXp', 'XP base al completar'],
      ['surpriseExamWindowFactor', 'Multiplicador dentro de la ventana (×)'],
      ['surpriseExamKolones', 'Kolones al completar (0 = sin premio)'],
    ],
  },
  {
    title: 'Simulacro',
    fields: [['simulacroKolones', 'Kolones al completar']],
  },
  {
    title: 'Partida Kodi (duelo)',
    fields: [
      ['duelCompletionKolones', 'Kolones por completar (ambos jugadores)'],
      ['duelWinKolones', 'Kolones extra al ganador'],
    ],
  },
  {
    title: 'Arena (la Especial premia por tramos en su pantalla)',
    fields: [
      ['arenaRapidaKolones', 'Rápida: Kolones al ganador'],
      ['arenaRapidaKokos', 'Rápida: Kokos al ganador'],
      ['arenaAmigosKolones', 'Amigos: Kolones al ganador'],
      ['arenaAmigosKokos', 'Amigos: Kokos al ganador'],
    ],
  },
  {
    title: 'XP de liga',
    fields: [
      ['leagueXpPerCorrect', 'Por respuesta correcta'],
      ['leagueXpSimulacro', 'Por simulacro completado'],
      ['leagueXpGameMode', 'Por modo de juego completado'],
      ['leagueXpDuelWon', 'Por duelo ganado'],
    ],
  },
  {
    title: 'Hábito diario',
    fields: [
      ['goalKolones', 'Meta diaria: Kolones'],
      ['goalXp', 'Meta diaria: XP'],
      ['goalLeagueXp', 'Meta diaria: XP de liga'],
      ['streakKolones', 'Racha: Kolones por día'],
      ['streakLeagueXp', 'Racha: XP de liga por día'],
    ],
  },
  {
    title: 'Otros',
    fields: [
      ['achievementKolones', 'Bono de Kolones por logro (los Kokos van por logro)'],
      ['kokosPerVideo', 'Kokos por video completado'],
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
