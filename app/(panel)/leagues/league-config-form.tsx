'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowDownToLineIcon,
  ArrowUpDownIcon,
  ArrowUpToLineIcon,
  AwardIcon,
  GiftIcon,
  SaveIcon,
  XIcon,
} from 'lucide-react';
import {
  LEAGUE_TIERS,
  useLeagueConfigs,
  useUpsertLeagueConfig,
  type LeagueConfig,
  type LeagueTier,
  type RewardSpec,
} from '@/hooks/use-league-config';
import { leagueMeta } from '@/lib/leagues';
import { useStoreItems, type StoreItem } from '@/hooks/use-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';

const GLOBAL = '__global__';
const NONE = '__none__';

type TierValues = {
  promotePct: number;
  promoteCap: number;
  demotePct: number;
  demoteCap: number;
  top3Kokos: number;
  top3Kolones: number;
  t410Kokos: number;
  t410Kolones: number;
  restKokos: number;
  restKolones: number;
  insigniaItemId: string;
};
type NumKey = Exclude<keyof TierValues, 'insigniaItemId'>;

const itemsOf = (reward: RewardSpec | undefined): string[] =>
  reward?.items?.map((i) => i.itemId) ?? [];

// Mini-faro por tramo de premio (oro / cielo / neutro), coherente con la convención de estados.
const BRACKET_TONE = {
  top3: 'border-warning/40 bg-warning/15 text-warning',
  t410: 'border-info/40 bg-info/15 text-info',
  rest: 'text-muted-foreground',
} as const;

function TierCard({
  tier,
  country,
  config,
  insignias,
  cosmetics,
}: {
  tier: LeagueTier;
  country: string | null;
  config?: LeagueConfig;
  insignias: StoreItem[];
  cosmetics: StoreItem[];
}) {
  const meta = leagueMeta(tier);
  const mutation = useUpsertLeagueConfig();
  const showPromote = tier !== 'genio'; // Genio = techo
  const showDemote = tier !== 'aprendiz'; // Aprendiz = piso

  const form = useForm<TierValues>({
    values: {
      promotePct: config?.promotePct ?? 0,
      promoteCap: config?.promoteCap ?? 0,
      demotePct: config?.demotePct ?? 0,
      demoteCap: config?.demoteCap ?? 0,
      top3Kokos: config?.rewardTop3?.kokos ?? 0,
      top3Kolones: config?.rewardTop3?.kolones ?? 0,
      t410Kokos: config?.rewardTop4to10?.kokos ?? 0,
      t410Kolones: config?.rewardTop4to10?.kolones ?? 0,
      restKokos: config?.rewardRest?.kokos ?? 0,
      restKolones: config?.rewardRest?.kolones ?? 0,
      insigniaItemId: config?.insigniaItemId ?? '',
    },
  });

  const [top3Items, setTop3Items] = useState<string[]>(itemsOf(config?.rewardTop3));
  const [t410Items, setT410Items] = useState<string[]>(itemsOf(config?.rewardTop4to10));
  const [restItems, setRestItems] = useState<string[]>(itemsOf(config?.rewardRest));

  const cosmeticName = (id: string) => cosmetics.find((c) => c.id === id)?.name ?? id;

  async function submit(v: TierValues): Promise<void> {
    const reward = (kokos: number, kolones: number, items: string[]) => ({
      kokos,
      kolones,
      items: items.map((itemId) => ({ itemId })),
    });
    try {
      await mutation.mutateAsync({
        leagueLevel: tier,
        country,
        promotePct: showPromote ? v.promotePct : 0,
        promoteCap: showPromote ? v.promoteCap : 0,
        demotePct: showDemote ? v.demotePct : 0,
        demoteCap: showDemote ? v.demoteCap : 0,
        rewardTop3: reward(v.top3Kokos, v.top3Kolones, top3Items),
        rewardTop4to10: reward(v.t410Kokos, v.t410Kolones, t410Items),
        rewardRest: reward(v.restKokos, v.restKolones, restItems),
        insigniaItemId: v.insigniaItemId || null,
      });
      toast.success(`${meta.label} guardado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error guardando');
    }
  }

  const numberField = (name: NumKey, label: string, step?: string) => (
    <Controller
      name={name}
      control={form.control}
      rules={{ min: { value: 0, message: '≥ 0' } }}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={`${tier}-${name}`}>{label}</FieldLabel>
          <Input
            id={`${tier}-${name}`}
            type="number"
            min={0}
            step={step}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          />
        </Field>
      )}
    />
  );

  const bracket = (
    rankLabel: string,
    toneCls: string,
    k: NumKey,
    kl: NumKey,
    items: string[],
    setItems: (v: string[]) => void,
  ) => (
    <div className="space-y-3 rounded-md border p-3">
      <Badge variant="outline" className={toneCls}>
        {rankLabel}
      </Badge>
      <div className="grid grid-cols-2 gap-3">
        {numberField(k, 'Kokos')}
        {numberField(kl, 'Kolones')}
      </div>
      <div className="space-y-2">
        <FieldLabel>Cosméticos extra</FieldLabel>
        {items.length === 0 && (
          <p className="text-muted-foreground text-xs">Sin cosméticos extra.</p>
        )}
        {items.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
          >
            <span>{cosmeticName(id)}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setItems(items.filter((x) => x !== id))}
            >
              <XIcon className="size-4" /> Quitar
            </Button>
          </div>
        ))}
        <Select
          value={NONE}
          onValueChange={(val) => {
            if (val !== NONE && !items.includes(val)) setItems([...items, val]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Agregar cosmético…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Agregar cosmético…</SelectItem>
            {cosmetics.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle
            className="inline-flex items-center gap-2 rounded-full border py-1 pr-4 pl-1.5"
            style={{ backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}40` }}
          >
            {meta.asset && (
              <Image src={meta.asset} alt="" width={36} height={36} unoptimized />
            )}
            <span className="text-base font-semibold">{meta.label}</span>
          </CardTitle>
          {!showDemote && (
            <Badge variant="outline" className="border-info/40 bg-info/15 text-info gap-1">
              <ArrowDownToLineIcon className="size-3" /> Piso · no desciende
            </Badge>
          )}
          {!showPromote && (
            <Badge variant="outline" className="border-info/40 bg-info/15 text-info gap-1">
              <ArrowUpToLineIcon className="size-3" /> Techo · no asciende
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <form className="flex h-full flex-col gap-6" onSubmit={form.handleSubmit(submit)}>
          <FieldGroup>
            {!config && (
              <p className="text-muted-foreground text-sm">
                Sin configuración para este ámbito; se creará al guardar.
              </p>
            )}

            <fieldset className="min-w-0 space-y-3">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <ArrowUpDownIcon className="text-muted-foreground size-4" />
                Movimiento entre ligas
              </legend>
              <div className="grid grid-cols-2 gap-4">
                {showPromote && numberField('promotePct', 'Ascienden (0–1)', '0.01')}
                {showPromote && numberField('promoteCap', 'Tope que asciende')}
                {showDemote && numberField('demotePct', 'Descienden (0–1)', '0.01')}
                {showDemote && numberField('demoteCap', 'Tope que desciende')}
              </div>
              <FieldDescription>
                Fracción = porción del grupo (0.2 = 20%). Tope = máximo de jugadores que se mueven.
              </FieldDescription>
            </fieldset>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <AwardIcon className="text-muted-foreground size-4" />
                Insignia de la liga
              </FieldLabel>
              <Controller
                name="insigniaItemId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(val) => field.onChange(val === NONE ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— ninguna —</SelectItem>
                      {insignias.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                Se otorga al ASCENDER a esta liga (Aprendiz: a la 1ª práctica/partida). De temporada.
              </FieldDescription>
            </Field>

            <fieldset className="min-w-0 space-y-3">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <GiftIcon className="text-muted-foreground size-4" />
                Premio por puesto (al cierre del ciclo)
              </legend>
              <FieldDescription>
                Kokos + Kolones + cosméticos extra. La insignia NO va acá (va por ascenso).
              </FieldDescription>
              {bracket('Top 3', BRACKET_TONE.top3, 'top3Kokos', 'top3Kolones', top3Items, setTop3Items)}
              {bracket('Top 4-10', BRACKET_TONE.t410, 't410Kokos', 't410Kolones', t410Items, setT410Items)}
              {bracket('Resto', BRACKET_TONE.rest, 'restKokos', 'restKolones', restItems, setRestItems)}
            </fieldset>

          </FieldGroup>

          <Button
            type="submit"
            className="mt-auto w-full"
            disabled={form.formState.isSubmitting}
          >
            <SaveIcon className="size-4" /> Guardar {meta.label}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LeagueConfigForm() {
  const [country, setCountry] = useState('');
  const { data: configs, isLoading } = useLeagueConfigs(country || null);
  const { data: insigniaPage } = useStoreItems({ itemType: 'insignia', page: 1, pageSize: 50 });
  const { data: cosmeticPage } = useStoreItems({ category: 'cosmetic', page: 1, pageSize: 100 });
  const insignias = insigniaPage?.items ?? [];
  // Cosméticos para los tramos: cualquier cosmético MENOS las insignias (esas van por ascenso).
  const cosmetics = (cosmeticPage?.items ?? []).filter((c) => c.itemType !== 'insignia');
  const byTier = new Map((configs ?? []).map((c) => [c.leagueLevel, c]));

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Field>
          <FieldLabel>Ámbito</FieldLabel>
          <Select value={country || GLOBAL} onValueChange={(v) => setCountry(v === GLOBAL ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL}>Global (default)</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Config por país; “Global” es el default cuando no hay una específica.
          </FieldDescription>
        </Field>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {LEAGUE_TIERS.map((tier) => {
            const config = byTier.get(tier);
            return (
              <TierCard
                key={`${tier}:${country}:${config?.id ?? 'new'}`}
                tier={tier}
                country={country || null}
                config={config}
                insignias={insignias}
                cosmetics={cosmetics}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
