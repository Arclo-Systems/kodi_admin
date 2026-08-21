'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

/**
 * Los seis estados que puede tener un evento de tienda. `pending_module_selection`
 * NO es un fallo: se sabe de quién es la compra y falta que el usuario elija sus
 * módulos, así que se pinta como aviso y no como error.
 */
const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  received: { label: 'En vuelo', variant: 'outline' },
  processed: { label: 'Procesado', variant: 'secondary' },
  failed: { label: 'Falló', variant: 'destructive' },
  unmapped: { label: 'SKU sin mapear', variant: 'destructive' },
  unresolved: { label: 'Sin dueño', variant: 'destructive' },
  pending_module_selection: { label: 'Faltan módulos', variant: 'outline' },
  founder_without_reservation: { label: 'Fundador sin cupo', variant: 'destructive' },
};

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

export function EventStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta?.variant ?? 'outline'} className="font-normal">
      {meta?.label ?? status}
    </Badge>
  );
}

const RESERVATION_META: Record<string, { label: string; variant: BadgeVariant }> = {
  reserved: { label: 'Apartado', variant: 'outline' },
  consumed: { label: 'Entregado', variant: 'default' },
  released: { label: 'Devuelto al pool', variant: 'secondary' },
};

export function ReservationStatusBadge({ status }: { status: string }) {
  const meta = RESERVATION_META[status];
  return (
    <Badge variant={meta?.variant ?? 'outline'} className="font-normal">
      {meta?.label ?? status}
    </Badge>
  );
}

export const dateTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const latency = (ms: number | null): string =>
  ms === null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

export type ReasonActionProps = {
  label: string;
  title: string;
  description: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
};

/**
 * Toda mutación de esta área exige motivo (M11): el backend lo valida y el
 * interceptor de auditoría lo guarda. El diálogo lo pide antes de disparar nada,
 * así que un 400 por motivo faltante no llega nunca a pasar.
 */
export function ReasonAction(props: ReasonActionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={props.destructive ? 'destructive' : 'outline'}
        size="sm"
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {props.label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={props.title}
        description={props.description}
        destructive={props.destructive}
        requireReason
        reasonMinLength={5}
        confirmLabel={props.label}
        onConfirm={async ({ reason }) => {
          await props.onConfirm(reason ?? '');
          toast.success(`${props.label}: listo`);
        }}
      />
    </>
  );
}

export function PayloadDialog({
  payload,
  trigger,
}: {
  payload: unknown;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {trigger ?? 'Ver payload'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notificación de Play</DialogTitle>
            <DialogDescription>
              El recibo viaja redactado desde que se guarda: acá nunca aparece completo.
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
