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
    <ol className="border-border relative ml-2 space-y-4 border-l">
      {data.items.map((entry) => (
        <li key={entry.id} className="ml-4">
          <span className="bg-primary absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full" />
          <time className="text-muted-foreground text-xs">
            {new Date(entry.createdAt).toLocaleString('es')}
          </time>
          <p className="text-sm font-medium">{entry.action}</p>
          <p className="text-muted-foreground text-xs">
            por <strong>{entry.actor.displayName}</strong> ({entry.actor.email})
          </p>
          {entry.reason && <p className="mt-1 text-xs italic">&ldquo;{entry.reason}&rdquo;</p>}
        </li>
      ))}
    </ol>
  );
}
