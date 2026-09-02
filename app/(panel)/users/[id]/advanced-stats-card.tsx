import { BarChart3Icon, TrendingUpIcon, TriangleAlertIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WeeklyTrendChart } from './advanced-stats-charts-lazy';

export type UserAdvancedStats = {
  masteryBySubject: { subject: string; accuracyPct: number; topics: number }[];
  simulacroAvgScore: number | null;
  simulacrosCompleted: number;
  weakestTopics: { topic: string; subject: string; accuracyPct: number }[];
  weeklyAccuracy: { week: string; accuracyPct: number; total: number }[];
};

// El % por materia es el promedio de los temas practicados: con uno o dos, un "100%"
// no describe nada. Se marca el sesgo en vez de presentarlo como dato firme.
const MIN_TOPICS_TRUSTED = 3;
// Dos puntos no son una tendencia: dibujar la línea con menos sería inventar evolución.
const MIN_WEEKS_TREND = 3;
const TREND_WINDOW_WEEKS = 8;
// Un 0% con ancho 0 se lee como "no hay dato". La astilla dice "hay dato, y es cero".
const MIN_BAR_WIDTH_PCT = 1.5;

const topicsLabel = (n: number) => `${n} ${n === 1 ? 'tema' : 'temas'}`;
const weeksLabel = (n: number) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;
const weekLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

type Tone = 'solid' | 'mid' | 'low';

const toneOf = (pct: number): Tone => (pct >= 70 ? 'solid' : pct >= 40 ? 'mid' : 'low');

// `--destructive` en oscuro (#B34734 sobre la card #1B2932) mide 2.7:1 — por debajo del
// 3:1 que WCAG 1.4.11 exige a un objeto gráfico; el coral claro (`--chart-5`) mide 5.6:1.
// En el tema claro se invierte: el coral claro cae a 2.6:1 sobre la card blanca y
// `--destructive` sube a 6.4:1. De ahí que el tono bajo cambie de token por tema.
const TONE_BAR: Record<Tone, string> = {
  solid: 'bg-success',
  mid: 'bg-warning',
  low: 'bg-destructive dark:bg-chart-5',
};

const TONE_TEXT: Record<Tone, string> = {
  solid: 'text-success',
  mid: 'text-warning',
  low: 'text-destructive dark:text-chart-5',
};

// Rayado de la muestra chica: franjas del color de la card "recortando" la barra. Con
// `var(--card)` el corte se lee igual sobre la card oscura y sobre la blanca.
const HATCH = {
  backgroundImage:
    'repeating-linear-gradient(115deg, color-mix(in srgb, var(--card) 55%, transparent) 0 3px, transparent 3px 7px)',
} as const;

// Cuatro columnas fijas: nombre · carril · % · respaldo. Que el % y el respaldo tengan
// su propia columna es lo que impide que un nombre largo empuje el número a otra línea.
const MEASURE_COLS =
  'grid-cols-[104px_minmax(0,1fr)_40px_56px] gap-2.5 min-[980px]:grid-cols-[132px_minmax(0,1fr)_42px_62px] min-[980px]:gap-[13px]';

function Track({ pct, tone, thin }: { pct: number; tone: Tone; thin?: boolean }) {
  return (
    <span
      data-slot="measure-track"
      aria-hidden
      className="bg-muted relative block h-[9px] overflow-hidden rounded-[5px]"
    >
      <span
        data-slot="measure-fill"
        className={cn(
          'absolute inset-y-0 left-0 rounded-[5px]',
          TONE_BAR[tone],
          thin && 'opacity-[0.55]',
        )}
        style={{ width: `${Math.max(pct, MIN_BAR_WIDTH_PCT)}%` }}
      >
        {thin && <span className="absolute inset-0" style={HATCH} />}
      </span>
    </span>
  );
}

function CardTitleRow({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BarChart3Icon;
  title: string;
  hint?: string;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <h3 className="flex items-center gap-[7px] text-[12.5px] font-semibold">
        <Icon className="text-chart-1 size-3.5 shrink-0" />
        {title}
      </h3>
      {hint && <span className="text-muted-foreground text-[11px] font-normal">{hint}</span>}
    </CardHeader>
  );
}

export function AdvancedStatsCard({ advanced }: { advanced: UserAdvancedStats | null }) {
  const hasData =
    !!advanced &&
    (advanced.masteryBySubject.length > 0 ||
      advanced.weeklyAccuracy.length > 0 ||
      advanced.weakestTopics.length > 0 ||
      advanced.simulacrosCompleted > 0);

  // Sin datos no se renderiza (nada de card ancha con una sola línea adentro).
  if (!advanced || !hasData) return null;

  return (
    <section>
      <h2 className="text-muted-foreground mb-3 text-sm font-semibold">Estadísticas avanzadas</h2>
      {/* Una card por bloque, cada una del alto de su contenido: el hueco muerto de la
          card única desaparece porque ya no hay una card que estirar (DESIGN L8). */}
      <div className="grid grid-cols-12 gap-4">
        <SummaryCard advanced={advanced} />
        <SubjectAccuracyCard subjects={advanced.masteryBySubject} />
        <WeakSpotsCard topics={advanced.weakestTopics} />
        <WeeklyTrendCard weeks={advanced.weeklyAccuracy} />
      </div>
    </section>
  );
}

function SummaryCard({ advanced }: { advanced: UserAdvancedStats }) {
  const { simulacroAvgScore, simulacrosCompleted, weeklyAccuracy, masteryBySubject } = advanced;

  const cells: { label: string; value: React.ReactNode; empty?: boolean }[] = [
    { label: 'Simulacros completados', value: simulacrosCompleted },
    {
      label: 'Promedio de simulacros',
      value:
        simulacroAvgScore !== null ? (
          <>
            {simulacroAvgScore} <Unit>/ 100</Unit>
          </>
        ) : (
          'Sin simulacros'
        ),
      empty: simulacroAvgScore === null,
    },
    {
      label: 'Semanas con práctica',
      value: (
        <>
          {weeklyAccuracy.length} <Unit>de {TREND_WINDOW_WEEKS}</Unit>
        </>
      ),
    },
    { label: 'Materias practicadas', value: masteryBySubject.length },
  ];

  return (
    <Card className="col-span-12 gap-3.5">
      <CardContent>
        <dl className="flex flex-wrap">
          {cells.map(({ label, value, empty }) => (
            <div
              key={label}
              className="border-border flex min-w-[130px] flex-1 basis-0 flex-col gap-[3px] border-r px-6 py-0.5 first:pl-0 last:border-r-0"
            >
              <dt className="text-muted-foreground text-[11px] font-medium">{label}</dt>
              <dd
                className={cn(
                  'm-0 leading-[1.2] font-semibold',
                  empty
                    ? 'text-muted-foreground text-[13px] font-medium'
                    : 'text-[17px] tabular-nums',
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <small className="text-muted-foreground text-[11px] font-normal">{children}</small>;
}

function SubjectAccuracyCard({ subjects }: { subjects: UserAdvancedStats['masteryBySubject'] }) {
  const hasThin = subjects.some((s) => s.topics < MIN_TOPICS_TRUSTED);

  return (
    <Card className="col-span-12 gap-3.5 min-[980px]:col-span-7">
      <CardTitleRow icon={BarChart3Icon} title="Aciertos por materia" hint="promedio de sus temas" />
      <CardContent className="flex flex-col gap-3.5">
        {subjects.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin datos de práctica todavía.</p>
        ) : (
          <>
            <div>
              <ul className="flex flex-col gap-2.5">
                {subjects.map((s) => {
                  const thin = s.topics < MIN_TOPICS_TRUSTED;
                  return (
                    <li key={s.subject} className={cn('grid items-center', MEASURE_COLS)}>
                      <span className="truncate text-right text-[12.5px]" title={s.subject}>
                        {s.subject}
                      </span>
                      <Track pct={s.accuracyPct} tone={toneOf(s.accuracyPct)} thin={thin} />
                      <span className="text-right text-[12.5px] font-semibold tabular-nums">
                        {s.accuracyPct}%
                      </span>
                      <span
                        className={cn(
                          'text-muted-foreground text-[11.5px] whitespace-nowrap tabular-nums',
                          thin && 'opacity-70',
                        )}
                      >
                        {topicsLabel(s.topics)}
                        {thin && (
                          <span className="sr-only">
                            {' '}
                            — muestra chica, menos de {MIN_TOPICS_TRUSTED} temas
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {/* El eje va bajo el carril y en su misma columna: si flotara a lo ancho de
                  la card, el 50% no caería sobre la mitad de las barras. */}
              <div className={cn('mt-2 grid', MEASURE_COLS)} aria-hidden>
                <span />
                <span className="border-border relative col-start-2 block h-[15px] border-t">
                  {[0, 50, 100].map((tick) => (
                    <span
                      key={tick}
                      className="text-muted-foreground absolute top-[3px] -translate-x-1/2 text-[10px] tabular-nums"
                      style={{ left: `${tick}%` }}
                    >
                      {tick}%
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <ul className="text-muted-foreground flex flex-wrap items-center gap-4 text-[11px]">
              <LegendKey className={TONE_BAR.solid}>70% o más</LegendKey>
              <LegendKey className={TONE_BAR.mid}>40 a 69%</LegendKey>
              <LegendKey className={TONE_BAR.low}>Bajo 40%</LegendKey>
              {hasThin && (
                <LegendKey className={cn(TONE_BAR.solid, 'opacity-[0.55]')} hatched>
                  Menos de {MIN_TOPICS_TRUSTED} temas: dato todavía flojo
                </LegendKey>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LegendKey({
  className,
  hatched,
  children,
}: {
  className: string;
  hatched?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn('relative block h-2 w-[15px] shrink-0 overflow-hidden rounded-[4px]', className)}
      >
        {hatched && <span className="absolute inset-0" style={HATCH} />}
      </span>
      {children}
    </li>
  );
}

function WeakSpotsCard({ topics }: { topics: UserAdvancedStats['weakestTopics'] }) {
  if (topics.length === 0) return null;

  return (
    <Card className="col-span-12 gap-3.5 min-[980px]:col-span-5">
      <CardTitleRow
        icon={TriangleAlertIcon}
        title="Dónde se traba"
        hint={`${topics.length} ${topics.length === 1 ? 'tema' : 'temas'} de menor acierto`}
      />
      <CardContent>
        <ul className="flex flex-col gap-3.5">
          {topics.map((t) => {
            const tone = toneOf(t.accuracyPct);
            return (
              <li key={t.topic} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="truncate text-[12.5px]" title={t.topic}>
                    {t.topic}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[12px] font-semibold tabular-nums',
                      TONE_TEXT[tone],
                    )}
                  >
                    {t.accuracyPct}%
                  </span>
                </div>
                <Track pct={t.accuracyPct} tone={tone} />
                <span className="text-muted-foreground text-[10.5px]">{t.subject}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function WeeklyTrendCard({ weeks }: { weeks: UserAdvancedStats['weeklyAccuracy'] }) {
  const enough = weeks.length >= MIN_WEEKS_TREND;

  return (
    <Card className="col-span-12 gap-3.5">
      <CardTitleRow
        icon={TrendingUpIcon}
        title="Evolución semanal"
        hint={enough ? `últimas ${TREND_WINDOW_WEEKS} semanas` : undefined}
      />
      <CardContent>
        {enough ? (
          <>
            <WeeklyTrendChart data={weeks} />
            <table className="sr-only">
              <caption>Aciertos por semana</caption>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week}>
                    <th scope="row">Semana del {weekLabel(w.week)}</th>
                    <td>{w.accuracyPct}% de aciertos</td>
                    <td>{w.total} preguntas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          // La card no desaparece ni reserva el hueco del gráfico: se encoge a su línea.
          <p
            data-slot="trend-hint"
            className="text-muted-foreground flex items-center gap-2.5 text-[12.5px]"
          >
            <span className="bg-chart-1 block size-1.5 shrink-0 rounded-full" aria-hidden />
            <span>
              {weeks.length === 0 ? (
                <>Sin práctica en las últimas {TREND_WINDOW_WEEKS} semanas.</>
              ) : (
                <>
                  Solo hay <b className="text-foreground font-medium">{weeksLabel(weeks.length)}</b>{' '}
                  con práctica. La línea aparece a partir de {MIN_WEEKS_TREND}.
                </>
              )}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
