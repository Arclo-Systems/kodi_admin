'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CircleCheckIcon,
  EyeIcon,
  FileSearchIcon,
  FlagIcon,
  GavelIcon,
  UserXIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/lib/severity';
import { ReportStatusBadge } from '@/lib/report-status';
import { useReport, useResolveReport, type ResolveInput } from '@/hooks/use-moderation';

const REASON_LABELS: Record<string, string> = {
  offensive_name: 'Nombre ofensivo',
  inappropriate_avatar: 'Avatar inapropiado',
  impersonation: 'Suplantación',
  cheating_speed: 'Trampa (velocidad)',
  cheating_pattern: 'Trampa (patrón)',
  abandonment: 'Abandono',
  other: 'Otro',
};

// Cada transición con su color e ícono propios (no 3 botones iguales).
const TRANSITIONS: {
  status: ResolveInput['status'];
  label: string;
  Icon: typeof EyeIcon;
  cls: string;
}[] = [
  {
    status: 'in_review',
    label: 'Tomar en revisión',
    Icon: EyeIcon,
    cls: 'border-info/50 text-info hover:bg-info/10 hover:text-info',
  },
  {
    status: 'actioned',
    label: 'Marcar accionado',
    Icon: CheckIcon,
    cls: 'border-success/50 text-success hover:bg-success/10 hover:text-success',
  },
  {
    status: 'escalated',
    label: 'Escalar',
    Icon: ArrowUpIcon,
    cls: 'border-warning/50 text-warning hover:bg-warning/10 hover:text-warning',
  },
  {
    status: 'dismissed',
    label: 'Desestimar',
    Icon: XIcon,
    cls: 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive',
  },
];

export function ReportDetail({ id }: { id: string }) {
  const { data: report, isLoading, isError } = useReport(id);
  const resolve = useResolveReport();
  const [target, setTarget] = useState<ResolveInput['status'] | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !report)
    return <p className="text-destructive text-sm">No se pudo cargar el reporte.</p>;

  const reported = report.reportedUser;
  const hasResolution = !!report.resolutionAction || !!report.resolutionNote;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={report.severity} />
        <ReportStatusBadge status={report.status} />
        <span className="text-muted-foreground text-sm">
          {REASON_LABELS[report.reason] ?? report.reason} ·{' '}
          {report.source === 'detector' ? 'Detector automático' : 'Reporte de usuario'}
        </span>
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserXIcon className="text-destructive size-4" />
              Usuario denunciado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {reported ? (
              <>
                <div>
                  <div className="font-medium">{reported.displayName}</div>
                  <div className="text-muted-foreground text-xs">
                    {reported.email} · {reported.country}
                  </div>
                </div>
                <Button variant="default" size="sm" asChild>
                  <Link href={`/users/${reported.id}`}>
                    Ver perfil / aplicar acción
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlagIcon className="text-info size-4" />
              Denunciante
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {report.reporter ? (
              <div className="font-medium">{report.reporter.displayName}</div>
            ) : (
              <span className="text-muted-foreground">Detector automático</span>
            )}
            {report.detail && <p className="text-muted-foreground mt-2 italic">«{report.detail}»</p>}
          </CardContent>
        </Card>
      </div>

      {report.evidence != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearchIcon className="text-muted-foreground size-4" />
              Evidencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-3 text-xs">
              {JSON.stringify(report.evidence, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {hasResolution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheckIcon className="text-success size-4" />
              Resolución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {report.resolutionAction && (
              <div>
                <span className="text-muted-foreground">Acción: </span>
                <span className="font-medium">{report.resolutionAction}</span>
              </div>
            )}
            {report.resolutionNote && <p className="text-muted-foreground">{report.resolutionNote}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GavelIcon className="text-primary size-4" />
            Resolver reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Registrá el estado del reporte. Las acciones sobre el usuario (ban, reset) se aplican
            desde su perfil.
          </p>
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS.map((t) => (
              <Button
                key={t.status}
                variant="outline"
                size="sm"
                className={cn(t.cls)}
                disabled={report.status === t.status}
                onClick={() => setTarget(t.status)}
              >
                <t.Icon className="size-4" />
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={TRANSITIONS.find((t) => t.status === target)?.label ?? 'Resolver'}
        description="Podés dejar una nota de resolución. Las acciones sobre el usuario (ban, reset) se aplican desde su perfil."
        requireReason
        reasonMinLength={0}
        confirmLabel="Confirmar"
        onConfirm={async ({ reason }) => {
          if (!target) return;
          try {
            await resolve.mutateAsync({
              id,
              input: { status: target, resolutionNote: reason || undefined },
            });
            toast.success('Reporte actualizado');
            setTarget(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}
