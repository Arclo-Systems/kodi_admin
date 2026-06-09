'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleDashedIcon, PencilIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { Switch } from '@/components/ui/switch';
import {
  useBots,
  useBotMutations,
  useTemplates,
  type BotRow,
  type BotTemplate,
} from '@/hooks/use-bots';
import { GenerateBotsButton } from './generate-bots-button';

function EditBotDialog({
  bot,
  templates,
  onClose,
}: {
  bot: BotRow | null;
  templates: BotTemplate[];
  onClose: () => void;
}) {
  const { update } = useBotMutations();
  const currentTemplateId =
    templates.find((t) => t.difficulty === bot?.botConfig?.template.difficulty)?.id ?? '';
  const [templateId, setTemplateId] = useState(currentTemplateId);
  const [active, setActive] = useState(bot?.botConfig?.isActive ?? false);

  function save(): void {
    if (!bot) return;
    update.mutate(
      { id: bot.id, body: { templateId, isActive: active } },
      {
        onSuccess: () => {
          toast.success('Bot actualizado');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={!!bot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar bot — {bot?.displayName}</DialogTitle>
        </DialogHeader>
        {bot && (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="eb-template">Plantilla</FieldLabel>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="eb-template">
                  <SelectValue placeholder="Elegí una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="eb-active">Estado</FieldLabel>
              <div className="flex items-center gap-2">
                <Switch id="eb-active" checked={active} onCheckedChange={setActive} />
                <span className="text-sm">{active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={!templateId || update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BotsTab({ canWrite }: { canWrite: boolean }) {
  const { data, isLoading, isError } = useBots({});
  const { data: templates } = useTemplates();
  const [editing, setEditing] = useState<BotRow | null>(null);

  const bots = data?.items ?? [];

  const columns: ColumnDef<BotRow, unknown>[] = [
    {
      accessorKey: 'displayName',
      header: 'Nombre',
      meta: { label: 'Nombre' },
      cell: ({ row }) => {
        const inits =
          row.original.displayName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('') || '?';
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {inits}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.original.displayName}</span>
          </div>
        );
      },
    },
    { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
    {
      id: 'template',
      header: 'Plantilla',
      meta: { label: 'Plantilla' },
      cell: ({ row }) => row.original.botConfig?.template.name ?? '—',
    },
    {
      id: 'accuracy',
      header: 'Accuracy',
      meta: { label: 'Accuracy' },
      cell: ({ row }) =>
        row.original.botConfig ? `${Math.round(row.original.botConfig.accuracy * 100)}%` : '—',
    },
    {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) => {
        const active = row.original.accountStatus === 'active' && row.original.botConfig?.isActive;
        return active ? (
          <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
        ) : (
          <StatusBadge tone="muted" icon={CircleDashedIcon} label="Inactivo" />
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) =>
        canWrite ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row.original);
              }}
            >
              <PencilIcon className="size-4" /> Editar
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={bots}
        total={bots.length}
        page={1}
        pageSize={Math.max(bots.length, 1)}
        loading={isLoading}
        onPageChange={() => {}}
        onRowClick={canWrite ? (b) => setEditing(b) : undefined}
        toolbar={canWrite ? <GenerateBotsButton /> : undefined}
        toolbarPortalId="bots-table-toolbar"
        emptyMessage={isError ? 'No se pudieron cargar los bots.' : 'Sin bots.'}
      />

      <EditBotDialog
        key={editing?.id}
        bot={editing}
        templates={templates ?? []}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
