'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { CheckIcon, CircleCheckIcon, ClockIcon, ReplaceIcon, RotateCcwIcon } from 'lucide-react';
import {
  useUserMissions,
  useMissionIntervention,
  MISSION_TYPE_LABELS,
  type UserMission,
} from '@/hooks/use-missions';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/lib/status-badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Kind = 'complete' | 'reset' | 'substitute';
type DialogState = { kind: Kind; mission: UserMission };

const KIND_LABEL: Record<Kind, string> = {
  complete: 'Completar',
  reset: 'Reiniciar',
  substitute: 'Sustituir',
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-CR', { dateStyle: 'short' });
}

export function MissionIntervention() {
  const [input, setInput] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const { data: missions, isLoading, isError } = useUserMissions(friendCode, !!friendCode);
  const intervention = useMissionIntervention(friendCode);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const columns = useMemo<ColumnDef<UserMission, unknown>[]>(
    () => [
      {
        id: 'mission',
        header: 'Misión',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{MISSION_TYPE_LABELS[row.original.type]}</span>
            <span className="text-muted-foreground text-xs">{fmtDate(row.original.date)}</span>
          </div>
        ),
      },
      {
        id: 'progress',
        header: 'Progreso',
        cell: ({ row }) => `${row.original.progress} / ${row.original.targetCount}`,
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.completed ? (
            <StatusBadge tone="success" icon={CircleCheckIcon} label="Completada" />
          ) : (
            <StatusBadge tone="info" icon={ClockIcon} label="En curso" />
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex justify-end gap-2">
              {!m.completed && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-success hover:text-success"
                  onClick={() => setDialog({ kind: 'complete', mission: m })}
                >
                  <CheckIcon className="size-3.5" />
                  Completar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary"
                onClick={() => setDialog({ kind: 'reset', mission: m })}
              >
                <RotateCcwIcon className="size-3.5" />
                Reiniciar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'substitute', mission: m })}>
                <ReplaceIcon className="size-3.5" />
                Sustituir
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  async function onConfirm({ reason }: { reason?: string }): Promise<void> {
    if (!dialog) return;
    const args = { missionId: dialog.mission.id, reason: reason ?? '' };
    await intervention[dialog.kind].mutateAsync(args);
    toast.success(`${KIND_LABEL[dialog.kind]}: hecho`);
  }

  return (
    <div className="space-y-4">
      <div className="flex max-w-xl items-end gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor="mi-code">Código de amigo</FieldLabel>
          <Input
            id="mi-code"
            placeholder="Código de amigo (ej. ABC123)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setFriendCode(input.trim());
            }}
          />
        </Field>
        <Button onClick={() => setFriendCode(input.trim())} disabled={!input.trim()}>
          Buscar
        </Button>
      </div>

      {isError && (
        <p className="text-destructive text-sm">
          No se encontraron misiones (¿código de amigo válido?).
        </p>
      )}

      {friendCode && !isError && (
        <DataTable
          columns={columns}
          data={missions ?? []}
          total={missions?.length ?? 0}
          page={1}
          pageSize={20}
          loading={isLoading}
          onPageChange={() => {}}
          emptyMessage="Este usuario no tiene misiones recientes"
        />
      )}

      {dialog && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          title={`${KIND_LABEL[dialog.kind]} misión`}
          description={`${MISSION_TYPE_LABELS[dialog.mission.type]} — ${fmtDate(dialog.mission.date)}. Requiere un motivo (queda en el audit log).`}
          requireReason
          reasonMinLength={3}
          confirmLabel={KIND_LABEL[dialog.kind]}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
