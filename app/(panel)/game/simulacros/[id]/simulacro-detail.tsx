'use client';

import { ClockIcon, CoinsIcon, FileTextIcon, ListChecksIcon, SparklesIcon, TargetIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/admin/kpi-card';
import { GameDetailShell } from '@/components/game/game-detail-shell';
import { UserRef } from '@/components/game/user-ref';
import { AccuracyBar, durationLabel } from '@/components/game/game-bits';

export function SimulacroDetail({ id, canAnnul }: { id: string; canAnnul: boolean }) {
  return (
    <GameDetailShell
      entity="simulacros"
      id={id}
      title="Simulacro"
      canAnnul={canAnnul}
      awardedStatuses={['completed']}
    >
      {(d) => {
        const dur = durationLabel(d.startedAt, d.endedAt);
        return (
          <>
            {d.user && (
              <div className="text-muted-foreground text-sm">
                Usuario: <UserRef id={d.user.id} name={d.user.displayName} isBot={d.user.isBot} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Score" value={d.score ?? '—'} icon={<TargetIcon />} tone="green" />
              <KpiCard label="Preguntas" value={d.totalQuestions ?? '—'} icon={<FileTextIcon />} tone="blue" />
              <KpiCard label="Duración" value={dur ?? '—'} icon={<ClockIcon />} tone="teal" />
              <KpiCard label="Kolones" value={d.kolonesEarned ?? 0} icon={<CoinsIcon />} tone="amber" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecksIcon className="text-primary size-4" />
                  Resultados por materia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(d.subjectResults ?? []).map((r) => (
                  <div key={r.subjectId}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium">{r.subject.name}</span>
                      <span className="text-muted-foreground text-xs">score {r.score}</span>
                    </div>
                    <AccuracyBar correct={r.questionsCorrect} total={r.questionsTotal} label="Aciertos" />
                  </div>
                ))}
                {(d.subjectResults ?? []).length === 0 && (
                  <p className="text-muted-foreground text-sm">Sin desglose por materia.</p>
                )}
              </CardContent>
            </Card>

            {d.aiAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SparklesIcon className="text-info size-4" />
                    Análisis IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {d.aiAnalysis}
                </CardContent>
              </Card>
            )}
          </>
        );
      }}
    </GameDetailShell>
  );
}
