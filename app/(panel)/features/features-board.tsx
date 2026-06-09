'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArchiveXIcon,
  HammerIcon,
  LightbulbIcon,
  type LucideIcon,
  PencilIcon,
  PlusIcon,
  RocketIcon,
  TicketIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFeatures,
  useUpdateFeature,
  useDeleteFeature,
  useCreateFeature,
  FEATURE_STATUSES,
  FEATURE_LABELS,
  PRIORITY_LABELS,
  type FeatureStatus,
  type FeaturePriority,
  type FeatureIdea,
} from '@/hooks/use-features';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeatureForm } from './feature-form';

// Faro de prioridad: Baja (verde) · Media (ámbar) · Alta (rojo).
const PRIORITY_BADGE: Record<FeaturePriority, string> = {
  low: 'border-success/40 bg-success/15 text-success',
  medium: 'border-warning/40 bg-warning/15 text-warning',
  high: 'border-destructive/40 bg-destructive/15 text-destructive',
};

// Icono + color por estado (columna y badge del detalle).
const STATUS_META: Record<FeatureStatus, { Icon: LucideIcon; color: string; badge: string }> = {
  idea: { Icon: LightbulbIcon, color: 'text-info', badge: 'border-info/40 bg-info/15 text-info' },
  construccion: {
    Icon: HammerIcon,
    color: 'text-warning',
    badge: 'border-warning/40 bg-warning/15 text-warning',
  },
  lanzado: {
    Icon: RocketIcon,
    color: 'text-success',
    badge: 'border-success/40 bg-success/15 text-success',
  },
  descartado: { Icon: ArchiveXIcon, color: 'text-muted-foreground', badge: 'text-muted-foreground' },
};

function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  const m = STATUS_META[status];
  const Icon = m.Icon;
  return (
    <Badge variant="outline" className={cn('gap-1', m.badge)}>
      <Icon className="size-3" />
      {FEATURE_LABELS[status]}
    </Badge>
  );
}

function FeatureCard({
  idea,
  onOpen,
}: {
  idea: FeatureIdea;
  onOpen: (idea: FeatureIdea) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="bg-card rounded-lg border p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="hover:bg-muted text-muted-foreground -ml-1 cursor-grab touch-none rounded p-1"
          aria-label={`Mover ${idea.title}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onOpen(idea)}
          className="flex-1 text-left"
          aria-label={`Ver ${idea.title}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium leading-tight">{idea.title}</div>
            <Badge variant="outline" className={cn('shrink-0', PRIORITY_BADGE[idea.priority])}>
              {PRIORITY_LABELS[idea.priority]}
            </Badge>
          </div>
          {idea.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{idea.description}</p>
          )}
          {idea.sourceTicketId && (
            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <TicketIcon className="size-3" /> Desde ticket
            </div>
          )}
          <div className="text-muted-foreground mt-1 text-xs">
            {idea.author?.displayName ?? '—'} ·{' '}
            {new Date(idea.createdAt).toLocaleDateString('es-CR')}
          </div>
        </button>
      </div>
    </div>
  );
}

function FeatureDialog({ idea, onClose }: { idea: FeatureIdea | null; onClose: () => void }) {
  const update = useUpdateFeature();
  const del = useDeleteFeature();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function close(): void {
    setEditing(false);
    setConfirmDelete(false);
    onClose();
  }

  return (
    <Dialog open={!!idea} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        {idea && !editing && (
          <>
            <DialogHeader>
              <DialogTitle>{idea.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <FeatureStatusBadge status={idea.status} />
                <Badge variant="outline" className={PRIORITY_BADGE[idea.priority]}>
                  {PRIORITY_LABELS[idea.priority]}
                </Badge>
                {idea.sourceTicketId && (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    <TicketIcon className="size-3" /> Desde ticket
                  </span>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium">Descripción</p>
                {idea.description ? (
                  <p className="text-sm whitespace-pre-wrap">{idea.description}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin descripción.</p>
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {idea.author?.displayName ?? '—'} ·{' '}
                {new Date(idea.createdAt).toLocaleDateString('es-CR')}
              </div>
              <div className="flex items-center gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <PencilIcon className="size-4" /> Editar
                </Button>
                {confirmDelete ? (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">¿Eliminar?</span>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={del.isPending}
                      onClick={() =>
                        del.mutate(idea.id, {
                          onSuccess: () => {
                            toast.success('Idea eliminada');
                            close();
                          },
                          onError: (err: Error) => toast.error(err.message),
                        })
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2Icon className="size-4" /> Eliminar
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
        {idea && editing && (
          <>
            <DialogHeader>
              <DialogTitle>Editar idea</DialogTitle>
            </DialogHeader>
            <FeatureForm
              key={idea.id}
              defaultValues={{
                title: idea.title,
                description: idea.description ?? undefined,
                priority: idea.priority,
              }}
              submitting={update.isPending}
              submitLabel="Guardar"
              onSubmit={(input) =>
                update.mutate(
                  { id: idea.id, input },
                  {
                    onSuccess: () => {
                      toast.success('Idea actualizada');
                      setEditing(false);
                    },
                    onError: (err: Error) => toast.error(err.message),
                  },
                )
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewFeatureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateFeature();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva idea</DialogTitle>
        </DialogHeader>
        <FeatureForm
          submitting={create.isPending}
          submitLabel="Crear idea"
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: () => {
                toast.success('Idea creada');
                onOpenChange(false);
              },
              onError: (err: Error) => toast.error(err.message),
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

function FeatureColumn({
  status,
  ideas,
  loading,
  onOpen,
}: {
  status: FeatureStatus;
  ideas: FeatureIdea[];
  loading: boolean;
  onOpen: (idea: FeatureIdea) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const StatusIcon = STATUS_META[status].Icon;
  return (
    <div className="flex min-w-64 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <StatusIcon className={cn('size-4', STATUS_META[status].color)} aria-hidden />
          {FEATURE_LABELS[status]}
        </h2>
        <Badge variant="secondary">{ideas.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'
        }`}
      >
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : ideas.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">Sin ideas</p>
        ) : (
          ideas.map((idea) => <FeatureCard key={idea.id} idea={idea} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export function FeaturesBoard() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FeatureIdea | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useFeatures(search || undefined);
  const update = useUpdateFeature();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const byStatus = useMemo(() => {
    const groups: Record<FeatureStatus, FeatureIdea[]> = {
      idea: [],
      construccion: [],
      lanzado: [],
      descartado: [],
    };
    for (const f of data?.items ?? []) groups[f.status]?.push(f);
    return groups;
  }, [data]);

  function onDragEnd(e: DragEndEvent): void {
    const target = e.over?.id as FeatureStatus | undefined;
    if (!target || !FEATURE_STATUSES.includes(target)) return;
    const idea = data?.items.find((f) => f.id === e.active.id);
    if (!idea || idea.status === target) return;
    update.mutate(
      { id: idea.id, input: { status: target } },
      {
        onSuccess: () => toast.success(`${idea.title} → ${FEATURE_LABELS[target]}`),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Buscar idea"
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4" />
          Nueva idea
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-4 lg:flex-row lg:overflow-x-auto">
          {FEATURE_STATUSES.map((status) => (
            <FeatureColumn
              key={status}
              status={status}
              ideas={byStatus[status]}
              loading={isLoading}
              onOpen={setEditing}
            />
          ))}
        </div>
      </DndContext>
      <FeatureDialog idea={editing} onClose={() => setEditing(null)} />
      <NewFeatureDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
