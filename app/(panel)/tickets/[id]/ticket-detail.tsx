'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  EyeIcon,
  GavelIcon,
  LightbulbIcon,
  MessageSquareTextIcon,
  SmartphoneIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { cn } from '@/lib/utils';
import { TicketStatusBadge, TicketTypeBadge } from '@/lib/ticket-meta';
import { useTicket, useTriageTicket, type TriageInput } from '@/hooks/use-tickets';
import { useCreateFeature } from '@/hooks/use-features';
import { FeatureForm } from '../../features/feature-form';

const CATEGORY_LABELS: Record<string, string> = {
  respuesta_incorrecta: 'Respuesta incorrecta',
  typo: 'Typo',
  ambigua: 'Ambigua',
  desactualizada: 'Desactualizada',
  ofensiva: 'Ofensiva',
  otro: 'Otro',
};

// Cada transición con su color e ícono propios (no botones iguales).
const TRANSITIONS: {
  status: TriageInput['status'];
  label: string;
  Icon: typeof EyeIcon;
  cls: string;
}[] = [
  {
    status: 'triaging',
    label: 'Tomar en triage',
    Icon: EyeIcon,
    cls: 'border-info/50 text-info hover:bg-info/10 hover:text-info',
  },
  {
    status: 'resolved',
    label: 'Resolver',
    Icon: CheckIcon,
    cls: 'border-success/50 text-success hover:bg-success/10 hover:text-success',
  },
  {
    status: 'dismissed',
    label: 'Descartar',
    Icon: XIcon,
    cls: 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive',
  },
];

export function TicketDetail({ id }: { id: string }) {
  const { data: ticket, isLoading, isError } = useTicket(id);
  const triage = useTriageTicket();
  const router = useRouter();
  const qc = useQueryClient();
  const createFeature = useCreateFeature();
  const [target, setTarget] = useState<TriageInput['status'] | null>(null);
  const [promoting, setPromoting] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !ticket)
    return <p className="text-destructive text-sm">No se pudo cargar el ticket.</p>;

  const canPromote = ticket.type === 'suggestion' && !ticket.promotedIdeaId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <TicketTypeBadge type={ticket.type} />
        <TicketStatusBadge status={ticket.status} />
        {ticket.category && (
          <span className="text-muted-foreground text-sm">
            {CATEGORY_LABELS[ticket.category] ?? ticket.category}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="text-primary size-4" />
            Mensaje
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="whitespace-pre-wrap">{ticket.message}</p>
        </CardContent>
      </Card>

      <div className={cn(ticket.questionId && 'grid items-start gap-4 sm:grid-cols-2')}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="text-primary size-4" />
              Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ticket.user ? (
              <>
                <div>
                  <div className="font-medium">{ticket.user.displayName}</div>
                  <div className="text-muted-foreground text-xs">
                    {ticket.user.email} · {ticket.user.country}
                  </div>
                </div>
                <Button variant="default" size="sm" asChild>
                  <Link href={`/users/${ticket.user.id}`}>
                    Ver perfil
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        {ticket.questionId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleHelpIcon className="text-info size-4" />
                Pregunta reportada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="text-muted-foreground font-mono text-xs break-all">
                {ticket.questionId}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/content/questions/${ticket.questionId}`}>
                  Ver / corregir pregunta
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {ticket.context != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SmartphoneIcon className="text-muted-foreground size-4" />
              Contexto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-3 text-xs">
              {JSON.stringify(ticket.context, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {ticket.resolution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheckIcon className="text-success size-4" />
              Resolución
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{ticket.resolution}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GavelIcon className="text-primary size-4" />
            Triage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Registrá el estado del ticket. Si es una sugerencia útil, promovela al roadmap.
          </p>
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS.map((t) => (
              <Button
                key={t.status}
                variant="outline"
                size="sm"
                className={cn(t.cls)}
                disabled={ticket.status === t.status}
                onClick={() => setTarget(t.status)}
              >
                <t.Icon className="size-4" />
                {t.label}
              </Button>
            ))}
            {canPromote && (
              <Button variant="default" size="sm" onClick={() => setPromoting(true)}>
                <LightbulbIcon className="size-4" />
                Promover a idea
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={TRANSITIONS.find((t) => t.status === target)?.label ?? 'Triage'}
        description="Podés dejar una nota de resolución (opcional)."
        requireReason
        reasonMinLength={0}
        confirmLabel="Confirmar"
        onConfirm={async ({ reason }) => {
          if (!target) return;
          try {
            await triage.mutateAsync({
              id,
              input: { status: target, resolution: reason || undefined },
            });
            toast.success('Ticket actualizado');
            setTarget(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <Dialog open={promoting} onOpenChange={setPromoting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover a idea</DialogTitle>
          </DialogHeader>
          <FeatureForm
            defaultValues={{
              title: ticket.message.slice(0, 80),
              description: ticket.message,
            }}
            submitting={createFeature.isPending}
            submitLabel="Crear idea"
            onSubmit={(input) => {
              createFeature.mutate(
                { ...input, sourceTicketId: id },
                {
                  onSuccess: () => {
                    // AUD-PLAN-4: el ticket pasó a resolved/promovido en el backend;
                    // refrescar su cache para que el botón "Promover" desaparezca.
                    qc.invalidateQueries({ queryKey: ['tickets'] });
                    toast.success('Sugerencia promovida a idea');
                    setPromoting(false);
                    router.push('/features');
                  },
                  onError: (err: Error) => toast.error(err.message),
                },
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
