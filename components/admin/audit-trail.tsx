'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuditTrail } from '@/hooks/use-audit-trail';

export type AuditTrailProps = {
  resourceType: string;
  resourceId: string;
};

export function AuditTrail({ resourceType, resourceId }: AuditTrailProps) {
  const { data, isLoading, error } = useAuditTrail(resourceType, resourceId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <p className="text-destructive text-sm">Error cargando historial</p>;
  if (!data?.items.length) {
    return <p className="text-muted-foreground text-sm">Sin actividad registrada.</p>;
  }

  return (
    <ul className="space-y-2">
      {data.items.map((entry) => (
        <li key={entry.id} className="bg-card rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-medium">
              {entry.action}
            </code>
            <time className="text-muted-foreground text-xs tabular-nums">
              {new Date(entry.createdAt).toLocaleString('es')}
            </time>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            por <strong className="text-foreground font-medium">{entry.actor.displayName}</strong> ·{' '}
            {entry.actor.email}
          </p>
          {entry.reason && (
            <p className="mt-1 text-xs italic">&ldquo;{entry.reason}&rdquo;</p>
          )}
        </li>
      ))}
    </ul>
  );
}
