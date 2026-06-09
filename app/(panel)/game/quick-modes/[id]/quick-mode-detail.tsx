'use client';

import { CoinsIcon, FlameIcon, HeartIcon, TargetIcon, TimerIcon, ZapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/admin/kpi-card';
import { GameDetailShell } from '@/components/game/game-detail-shell';
import { UserRef } from '@/components/game/user-ref';
import { AccuracyBar } from '@/components/game/game-bits';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  contrarreloj: 'Contrarreloj',
  supervivencia: 'Supervivencia',
};

export function QuickModeDetail({ id, canAnnul }: { id: string; canAnnul: boolean }) {
  return (
    <GameDetailShell
      entity="quick-modes"
      id={id}
      title="Sesión rápida"
      canAnnul={canAnnul}
      awardedStatuses={['completed', 'game_over']}
    >
      {(d) => {
        const answered = d.questionsAnswered ?? 0;
        const correct = d.questionsCorrect ?? 0;
        const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        const isSurvival = d.type === 'supervivencia';
        return (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {d.user && (
                <span className="text-muted-foreground">
                  Usuario: <UserRef id={d.user.id} name={d.user.displayName} isBot={d.user.isBot} />
                </span>
              )}
              {d.type && (
                <Badge variant="secondary" className="gap-1">
                  <TimerIcon className="size-3" />
                  {TYPE_LABELS[d.type] ?? d.type}
                </Badge>
              )}
            </div>

            <div
              className={cn(
                'grid grid-cols-2 gap-4',
                isSurvival ? 'sm:grid-cols-5' : 'sm:grid-cols-4',
              )}
            >
              <KpiCard
                label="Precisión"
                value={`${pct}%`}
                icon={<TargetIcon />}
                tone={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'}
              />
              <KpiCard label="Combo máx" value={d.maxCombo ?? 0} icon={<FlameIcon />} tone="amber" />
              <KpiCard label="Kolones" value={d.kolonesEarned ?? 0} icon={<CoinsIcon />} tone="teal" />
              <KpiCard label="XP" value={d.xpEarned ?? 0} icon={<ZapIcon />} tone="blue" />
              {isSurvival && (
                <KpiCard label="Vidas" value={d.livesRemaining ?? 0} icon={<HeartIcon />} tone="red" />
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TargetIcon className="text-primary size-4" />
                  Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AccuracyBar correct={correct} total={answered} />
              </CardContent>
            </Card>
          </>
        );
      }}
    </GameDetailShell>
  );
}
