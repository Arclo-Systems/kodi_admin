'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { HistoryIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { ActivePromptBadge } from '@/lib/ai-prompt-status';
import {
  useAiPromptMutations,
  type AiPromptDetail,
  type AiPromptVersion,
} from '@/hooks/use-ai-prompts';

export function PromptVersionHistory({
  prompt,
  role,
}: {
  prompt: AiPromptDetail;
  role: AdminRole;
}) {
  const m = useAiPromptMutations();
  const canActivate = can(role, 'content:ai-prompt:activate');
  const [pending, setPending] = useState<AiPromptVersion | null>(null);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HistoryIcon className="text-primary size-4" />
          Historial de versiones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {prompt.versions.map((v) => {
            const active = v.id === prompt.activeVersionId;
            return (
              <li key={v.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">v{v.version}</span>
                  {active && <ActivePromptBadge active label="Activa" />}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(v.createdAt).toLocaleDateString('es')}
                  </span>
                </div>
                {v.note && <p className="text-muted-foreground mt-1 text-xs">{v.note}</p>}
                <p className="text-muted-foreground mt-1 line-clamp-3">{v.systemText}</p>
                {!active && canActivate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success hover:text-success mt-2"
                    disabled={m.activate.isPending}
                    onClick={() => setPending(v)}
                  >
                    <RotateCcwIcon className="size-4" />
                    Activar (rollback)
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `Activar v${pending.version}` : ''}
        description="Esta versión pasará a ser el prompt activo del tutor IA en producción (rollback)."
        confirmLabel="Activar"
        onConfirm={async () => {
          if (!pending) return;
          await m.activate.mutateAsync({ id: prompt.id, versionId: pending.id });
          toast.success(`Activada v${pending.version}`);
        }}
      />
    </Card>
  );
}
