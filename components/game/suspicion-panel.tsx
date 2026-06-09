import Link from 'next/link';
import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Suspicion } from '@/hooks/use-game';

// Indicadores de sospecha por jugador (heurísticas de los detectores de moderación, inline).
export function SuspicionPanel({ suspicion }: { suspicion: Suspicion[] }) {
  if (suspicion.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin datos de respuestas para evaluar.</p>;
  }
  return (
    <div className="space-y-2">
      {suspicion.map((s) => {
        const flagged = s.speedSuspicious || s.patternSuspicious;
        return (
          <div
            key={s.userId}
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm',
              flagged ? 'border-destructive/40 bg-destructive/5' : 'border-border',
            )}
          >
            {flagged ? (
              <AlertTriangleIcon className="text-destructive size-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2Icon className="text-success size-4 shrink-0" aria-hidden />
            )}
            <Link
              href={`/users/${s.userId}`}
              className="text-primary font-mono text-xs hover:underline"
            >
              {s.userId.slice(0, 8)}
            </Link>
            <span className="text-muted-foreground tabular-nums">
              {s.fastCorrect}/{s.total} rápidas-correctas · {Math.round(s.fastCorrectRate * 100)}% ·
              racha {s.maxFastStreak}
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              {s.speedSuspicious && <Badge variant="destructive">Velocidad</Badge>}
              {s.patternSuspicious && <Badge variant="destructive">Patrón</Badge>}
              {!flagged && (
                <Badge variant="outline" className="border-success/40 text-success">
                  Limpio
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
