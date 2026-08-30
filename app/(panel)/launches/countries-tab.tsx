'use client';

import { useState } from 'react';
import {
  CalendarIcon,
  CircleCheckIcon,
  ClockIcon,
  GlobeIcon,
  HammerIcon,
  type LucideIcon,
  PauseIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { cn } from '@/lib/utils';
import { canWithScope } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import {
  useCountryRollouts,
  useCountryRolloutActions,
  type CountryLaunchStatus,
  type CountryRollout,
} from '@/hooks/use-launches';
import { CountryFormDialog } from './country-edit-dialog';

// Faro de estado de lanzamiento: Planeado (neutral) · En preparación (cielo) · Live (verde) · Pausado (ámbar).
const STATUS_META: Record<CountryLaunchStatus, { label: string; Icon: LucideIcon; badge: string }> = {
  planned: { label: 'Planeado', Icon: ClockIcon, badge: 'text-foreground' },
  in_preparation: {
    label: 'En preparación',
    Icon: HammerIcon,
    badge: 'border-info/40 bg-info/15 text-info',
  },
  live: { label: 'Live', Icon: CircleCheckIcon, badge: 'border-success/40 bg-success/15 text-success' },
  paused: { label: 'Pausado', Icon: PauseIcon, badge: 'border-warning/40 bg-warning/15 text-warning' },
};

function StatusBadge({ status }: { status: CountryLaunchStatus }) {
  const m = STATUS_META[status];
  const Icon = m.Icon;
  return (
    <Badge variant="outline" className={cn('gap-1', m.badge)}>
      <Icon className="size-3" />
      {m.label}
    </Badge>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
const fmt = (n: number) => n.toLocaleString('es-CR');

function CountryCard({
  rollout,
  canEdit,
  onEdit,
  onDelete,
}: {
  rollout: CountryRollout;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Un país live no se puede sacar del roadmap: el registro de sus usuarios depende de esa fila.
  const esLive = rollout.status === 'live';
  const tieneUsuarios = (rollout.registeredUsers ?? 0) > 0;

  return (
    <Card className="gap-2">
      <CardHeader className="flex items-start justify-between gap-2 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          {rollout.rank !== null && (
            <span
              className="text-muted-foreground w-6 shrink-0 text-xs font-semibold tabular-nums"
              title={`Puesto ${rollout.rank} por público anual`}
            >
              #{rollout.rank}
            </span>
          )}
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
          >
            {rollout.country}
          </span>
          {rollout.name}
        </CardTitle>
        {canEdit && (
          <div className="-mr-1 flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
              <PencilIcon className="size-3.5" /> Editar
            </Button>
            {!esLive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7"
                disabled={tieneUsuarios}
                title={
                  tieneUsuarios
                    ? 'No se puede eliminar: el país tiene usuarios registrados.'
                    : undefined
                }
                onClick={onDelete}
              >
                <Trash2Icon className="size-3.5" />
                <span className="sr-only">Eliminar {rollout.name}</span>
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <StatusBadge status={rollout.status} />
        {rollout.notes && <p className="text-foreground/80 line-clamp-2 text-xs">{rollout.notes}</p>}
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <UsersIcon className="size-3.5 shrink-0" />
          {rollout.publicoAnual !== null ? (
            <span>
              Público: <span className="tabular-nums">{fmt(rollout.publicoAnual)}</span>/año
            </span>
          ) : (
            <span>Público sin estimar</span>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarIcon className="size-3.5 shrink-0" />
          {rollout.launchedAt ? (
            <span>Lanzado {fmtDate(rollout.launchedAt)}</span>
          ) : rollout.targetDate ? (
            <span>Objetivo {fmtDate(rollout.targetDate)}</span>
          ) : (
            <span>Sin fecha</span>
          )}
        </div>
        <GoalProgress rollout={rollout} />
      </CardContent>
    </Card>
  );
}

// Meta de usuarios + progreso. Con meta: barra (registrados/meta) + activos como dato secundario.
// Sin meta: solo los conteos, para que la card siga siendo informativa.
function GoalProgress({ rollout }: { rollout: CountryRollout }) {
  const { userGoal, registeredUsers, activeUsers } = rollout;

  // País fuera del scope del admin: no hay conteos. Mostramos solo la meta si existe.
  if (registeredUsers == null || activeUsers == null) {
    if (userGoal == null) return null;
    return <p className="text-muted-foreground text-xs">Meta: {fmt(userGoal)} usuarios</p>;
  }

  if (userGoal == null) {
    return (
      <p className="text-muted-foreground text-xs">
        Sin meta · {fmt(registeredUsers)} registrados · {fmt(activeUsers)} activos (30d)
      </p>
    );
  }
  const pct = userGoal > 0 ? Math.round((registeredUsers / userGoal) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Meta de usuarios</span>
        <span className="tabular-nums font-medium">
          {fmt(registeredUsers)} / {fmt(userGoal)} · {pct}%
        </span>
      </div>
      <Progress value={Math.min(100, pct)} className="h-2" aria-label={`Progreso ${pct}%`} />
      <p className="text-muted-foreground text-xs">Activos (30d): {fmt(activeUsers)}</p>
    </div>
  );
}

export function CountriesTab({ role, isGlobalScope }: { role: AdminRole; isGlobalScope: boolean }) {
  const { data, isLoading, isError } = useCountryRollouts();
  const { remove } = useCountryRolloutActions();
  const canEdit = canWithScope(role, isGlobalScope, 'launches:country');

  const [editing, setEditing] = useState<CountryRollout | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CountryRollout | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar el roadmap por país.</AlertDescription>
      </Alert>
    );
  }

  // El backend ya devuelve la lista rankeada por público anual (sin dato al final).
  const rollouts = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Ordenado por público anual estimado. Los países sin estimar van al final.
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" /> Agregar país
          </Button>
        )}
      </div>

      {rollouts.length === 0 ? (
        <EmptyState
          icon={<GlobeIcon />}
          message="Sin países en el roadmap"
          description="Agregá el primer país para empezar a planear la expansión."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rollouts.map((r) => (
            <CountryCard
              key={r.country}
              rollout={r}
              canEdit={canEdit}
              onEdit={() => setEditing(r)}
              onDelete={() => setDeleting(r)}
            />
          ))}
        </div>
      )}

      {editing && (
        <CountryFormDialog rollout={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
      {creating && <CountryFormDialog rollout={null} open onOpenChange={setCreating} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Eliminar país del roadmap"
        description={
          deleting
            ? `Se quitará ${deleting.name} del roadmap. No afecta a la app: el país no estaba habilitado ahí.`
            : ''
        }
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.country);
          toast.success(`${deleting.name} salió del roadmap`);
          setDeleting(null);
        }}
      />
    </div>
  );
}
