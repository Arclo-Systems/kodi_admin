'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { HistoryIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useRestoreVersion } from '@/hooks/use-review-material';

type HistoryEntry = {
  id: string;
  version: number;
  createdAt: string;
  /** Lo que se muestra como adelanto de esa versión (texto plano). */
  preview: string;
};

/**
 * Historial de versiones de una pieza, con el mismo lenguaje que el de prompts
 * IA (`prompt-version-history.tsx`): lista descendente, adelanto recortado y
 * restaurar detrás de confirmación. Restaurar no borra nada — archiva lo
 * vigente y devuelve la pieza a borrador.
 */
export function VersionHistory({
  topicId,
  piece,
  entries,
  isLoading,
}: {
  topicId: string;
  piece: 'summary' | 'podcast';
  entries: HistoryEntry[];
  isLoading: boolean;
}) {
  const restore = useRestoreVersion(topicId, piece);
  const [pending, setPending] = useState<HistoryEntry | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <HistoryIcon className="text-primary size-4" />
          Historial de versiones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no hay versiones anteriores. Se archiva una cada vez que se guarda contenido
            distinto.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">v{entry.version}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(entry.createdAt).toLocaleDateString('es')}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-3">{entry.preview}</p>
                {/* Restaurar es editar, no publicar: lo puede hacer quien edita
                    (el guard de la página ya exige permiso de escritura). */}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={restore.isPending}
                  onClick={() => setPending(entry)}
                >
                  <RotateCcwIcon className="size-4" />
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? `Restaurar v${pending.version}` : ''}
        description="El contenido actual se archiva como una versión más y la pieza vuelve a borrador. No se pierde nada."
        confirmLabel="Restaurar"
        onConfirm={async () => {
          if (!pending) return;
          await restore.mutateAsync(pending.id);
          toast.success(`Restaurada la v${pending.version}`);
          setPending(null);
        }}
      />
    </Card>
  );
}
