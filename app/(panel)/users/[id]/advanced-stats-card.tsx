import { BarChart3Icon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubjectAccuracyChart, WeeklyTrendChart } from './advanced-stats-charts-lazy';

export type UserAdvancedStats = {
  masteryBySubject: { subject: string; accuracyPct: number; topics: number }[];
  simulacroAvgScore: number | null;
  simulacrosCompleted: number;
  weakestTopics: { topic: string; accuracyPct: number }[];
  weeklyAccuracy: { week: string; accuracyPct: number; total: number }[];
};

// El % por materia es el promedio de los temas practicados: con uno o dos, un "100%"
// no describe nada. Se marca el sesgo en vez de presentarlo como dato firme.
const MIN_TOPICS_TRUSTED = 3;
// Dos puntos no son una tendencia: dibujar la línea con menos sería inventar evolución.
const MIN_WEEKS_TREND = 3;

const topicsLabel = (n: number) => `${n} ${n === 1 ? 'tema' : 'temas'}`;
const weeksLabel = (n: number) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;
const weekLabel = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

export function AdvancedStatsCard({ advanced }: { advanced: UserAdvancedStats | null }) {
  const hasData =
    !!advanced &&
    (advanced.masteryBySubject.length > 0 ||
      advanced.weeklyAccuracy.length > 0 ||
      advanced.weakestTopics.length > 0 ||
      advanced.simulacrosCompleted > 0);

  // Sin datos no se renderiza (nada de card ancha con una sola línea adentro).
  if (!advanced || !hasData) return null;

  const subjects = advanced.masteryBySubject;
  const weeks = advanced.weeklyAccuracy;
  const thinSubjects = subjects.some((s) => s.topics < MIN_TOPICS_TRUSTED);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="text-info size-4" />
          Estadísticas avanzadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Promedio de simulacros
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {advanced.simulacroAvgScore !== null ? (
                <span className="tabular-nums">{advanced.simulacroAvgScore} / 100</span>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Simulacros completados
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {advanced.simulacrosCompleted}
            </dd>
          </div>
        </dl>

        {/* Dos gráficos lado a lado en monitor ancho: el ancho sobrante se llena con
            datos en vez de estirar una barra de 100% a todo el viewport (DESIGN L3/L4). */}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">
              Aciertos por materia
            </h3>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos de práctica todavía.</p>
            ) : (
              <>
                <SubjectAccuracyChart data={subjects} />
                <table className="sr-only">
                  <caption>Aciertos por materia</caption>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.subject}>
                        <th scope="row">{s.subject}</th>
                        <td>{s.accuracyPct}% de aciertos</td>
                        <td>promedio de {topicsLabel(s.topics)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {thinSubjects && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Las materias con menos de {MIN_TOPICS_TRUSTED} temas practicados tienen un
                    porcentaje poco confiable: es el promedio de muy pocos temas.
                  </p>
                )}
              </>
            )}
          </section>

          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">
              Evolución — aciertos por semana (últimas 8)
            </h3>
            {weeks.length < MIN_WEEKS_TREND ? (
              <p className="text-muted-foreground text-sm">
                {weeks.length === 0
                  ? 'Sin práctica en las últimas 8 semanas.'
                  : `Solo hay ${weeksLabel(weeks.length)} con práctica; la evolución se dibuja a partir de ${MIN_WEEKS_TREND}.`}
              </p>
            ) : (
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
            )}
          </section>
        </div>

        {advanced.weakestTopics.length > 0 && (
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">
              Temas a mejorar (menor acierto)
            </h3>
            <ul className="max-w-xl space-y-1">
              {advanced.weakestTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{t.topic}</span>
                  <span className="text-destructive tabular-nums">{t.accuracyPct}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
