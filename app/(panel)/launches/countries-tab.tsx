'use client';

import { useState } from 'react';
import {
  CalendarIcon,
  CircleCheckIcon,
  ClockIcon,
  HammerIcon,
  type LucideIcon,
  PauseIcon,
  PencilIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { canWithScope } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { useCountryRollouts, type CountryLaunchStatus, type CountryRollout } from '@/hooks/use-launches';
import { CountryEditDialog } from './country-edit-dialog';

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

const COLUMNS: CountryLaunchStatus[] = ['planned', 'in_preparation', 'live', 'paused'];
const COUNTRY_NAME: Record<string, string> = {
  CR: 'Costa Rica',
  GT: 'Guatemala',
  SV: 'El Salvador',
  HN: 'Honduras',
  PA: 'Panamá',
  CL: 'Chile',
  MX: 'México',
  AR: 'Argentina',
};
const countryName = (code: string) => COUNTRY_NAME[code] ?? code;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CR');
const fmt = (n: number) => n.toLocaleString('es-CR');

function CountryCard({
  rollout,
  canEdit,
  onEdit,
}: {
  rollout: CountryRollout;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="flex items-center justify-between gap-2 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
          >
            {rollout.country}
          </span>
          {countryName(rollout.country)}
        </CardTitle>
        {canEdit && (
          <Button variant="ghost" size="sm" className="-mr-1 h-7" onClick={onEdit}>
            <PencilIcon className="size-3.5" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {rollout.notes && <p className="text-foreground/80 line-clamp-2 text-xs">{rollout.notes}</p>}
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
  const canEdit = canWithScope(role, isGlobalScope, 'launches:country');
  const [editing, setEditing] = useState<CountryRollout | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <p className="text-destructive text-sm">No se pudo cargar el roadmap por país.</p>;

  const rollouts = data ?? [];

  return (
    <div className="space-y-6">
      {/* Secciones por fase (solo las que tienen países), en orden de ciclo de vida. */}
      {COLUMNS.map((status) => {
        const inCol = rollouts.filter((r) => r.status === status);
        if (inCol.length === 0) return null;
        return (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-muted-foreground text-xs tabular-nums">{inCol.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inCol.map((r) => (
                <CountryCard
                  key={r.country}
                  rollout={r}
                  canEdit={canEdit}
                  onEdit={() => setEditing(r)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {rollouts.length === 0 && (
        <p className="text-muted-foreground text-sm">Sin países en el roadmap.</p>
      )}

      {editing && <CountryEditDialog rollout={editing} open onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  );
}
