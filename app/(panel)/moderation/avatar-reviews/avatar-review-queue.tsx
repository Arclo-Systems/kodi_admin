'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckIcon,
  FlagIcon,
  ImageOffIcon,
  MaximizeIcon,
  ShieldCheckIcon,
  ShieldXIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ApiError } from '@/lib/bff';
import { timeAgo } from '@/lib/relative-time';
import {
  AVATAR_REVIEW_STATUS_LABELS,
  AvatarReviewStatusBadge,
} from '@/lib/avatar-review-status';
import {
  AVATAR_REVIEW_NOTE_MAX_LENGTH,
  AVATAR_REVIEW_PAGE_SIZE,
  AVATAR_REVIEW_STATUSES,
  useAvatarReviews,
  useDecideAvatarReview,
  type AvatarReview,
  type AvatarReviewDecision,
  type AvatarReviewStatus,
} from '@/hooks/use-avatar-reviews';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' });

const reportsLabel = ({ report_count: count }: AvatarReview): string =>
  count === 0 ? 'sin denuncias' : count === 1 ? '1 denuncia' : `${count} denuncias`;

/**
 * Foto tal como la ve el resto de la app. Es el dato que se juzga, así que se pinta
 * grande y sin clic de por medio; si la URL ya no resuelve (foto retirada del bucket)
 * cae a un marcador en vez de dejar el hueco roto del navegador.
 */
function ReviewPhoto({ review, onZoom }: { review: AvatarReview; onZoom: () => void }) {
  const [broken, setBroken] = useState(false);
  const reported = review.report_count > 0;

  if (broken) {
    return (
      <div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-lg border">
        <ImageOffIcon className="size-5" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onZoom}
      aria-label={`Ampliar la foto de ${review.user.display_name}`}
      className="focus-visible:ring-ring group relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Image
        src={review.photo_url}
        alt={`Foto de perfil de ${review.user.display_name}`}
        width={96}
        height={96}
        unoptimized
        onError={() => setBroken(true)}
        className={
          reported
            ? 'ring-destructive size-24 rounded-lg object-cover ring-2'
            : 'size-24 rounded-lg border object-cover'
        }
      />
      <span className="bg-foreground/55 text-background absolute inset-0 flex items-center justify-center rounded-lg opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
        <MaximizeIcon className="size-5" />
      </span>
    </button>
  );
}

type QueueHandlers = {
  canDecide: boolean;
  busyId: string | null;
  onZoom: (review: AvatarReview) => void;
  onApprove: (review: AvatarReview) => void;
  onReject: (review: AvatarReview) => void;
};

function buildColumns(handlers: QueueHandlers): ColumnDef<AvatarReview, unknown>[] {
  return [
    {
      id: 'photo',
      header: 'Foto',
      meta: { label: 'Foto' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <ReviewPhoto review={row.original} onZoom={() => handlers.onZoom(row.original)} />
      ),
    },
    {
      id: 'user',
      header: 'Usuario',
      meta: { label: 'Usuario' },
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="min-w-0 space-y-0.5">
            <Link
              href={`/users/${user.id}`}
              className="hover:text-primary truncate font-medium underline-offset-4 hover:underline"
            >
              {user.display_name}
            </Link>
            {user.username && (
              <div className="text-muted-foreground truncate text-xs">@{user.username}</div>
            )}
            <div className="text-muted-foreground truncate text-xs">{user.country}</div>
          </div>
        );
      },
    },
    {
      id: 'reports',
      header: 'Denuncias',
      meta: { label: 'Denuncias' },
      enableSorting: false,
      cell: ({ row }) => {
        const { report_count: count, reported_at: reportedAt } = row.original;
        if (count === 0) return <span className="text-muted-foreground text-xs">Sin denuncias</span>;
        return (
          <div className="space-y-1">
            <Badge variant="destructive" className="gap-1">
              <FlagIcon className="size-3" aria-hidden />
              {reportsLabel(row.original)}
            </Badge>
            {reportedAt && (
              <div className="text-muted-foreground text-xs">Última {timeAgo(reportedAt)}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'waiting',
      header: 'Espera',
      meta: { label: 'Espera' },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="text-sm">{timeAgo(row.original.waiting_since)}</div>
          <div className="text-muted-foreground text-xs">
            {fmtDateTime(row.original.waiting_since)}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      enableSorting: false,
      cell: ({ row }) => {
        const { status, reviewed_at: reviewedAt, review_note: note } = row.original;
        return (
          <div className="space-y-1">
            <AvatarReviewStatusBadge status={status} />
            {reviewedAt && (
              <div className="text-muted-foreground text-xs">{fmtDateTime(reviewedAt)}</div>
            )}
            {note && <p className="text-muted-foreground max-w-48 text-xs italic">«{note}»</p>}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { label: 'Acciones' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const review = row.original;
        if (!handlers.canDecide || review.status !== 'pending') return null;
        const busy = handlers.busyId === review.id;
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className="border-success/50 text-success hover:bg-success/10 hover:text-success"
              aria-label={`Aprobar la foto de ${review.user.display_name}`}
              onClick={() => handlers.onApprove(review)}
            >
              <CheckIcon className="size-4" />
              Aprobar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Rechazar la foto de ${review.user.display_name}`}
              onClick={() => handlers.onReject(review)}
            >
              <ShieldXIcon className="size-4" />
              Rechazar
            </Button>
          </div>
        );
      },
    },
  ];
}

const EMPTY_STATE: Record<AvatarReviewStatus, { message: string; description: string }> = {
  pending: {
    message: 'No hay fotos esperando revisión',
    description:
      'Cuando alguien suba una foto de perfil aparece acá, ya publicada en la app. Las denunciadas se ordenan primero.',
  },
  approved: {
    message: 'Todavía no aprobaste ninguna foto',
    description: 'Acá queda el historial de las fotos que dejaste pasar.',
  },
  rejected: {
    message: 'No rechazaste ninguna foto',
    description: 'Acá queda el historial de las fotos retiradas de la app, con su nota.',
  },
  superseded: {
    message: 'Ninguna foto quedó sin revisar',
    description:
      'Acá caen las fotos que el usuario reemplazó por otra antes de que llegara su turno.',
  },
};

export function AvatarReviewQueue({ canDecide }: { canDecide: boolean }) {
  const [status, setStatus] = useState<AvatarReviewStatus>('pending');
  const [page, setPage] = useState(1);
  const [zoomed, setZoomed] = useState<AvatarReview | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AvatarReview | null>(null);

  const { data, isLoading, isError } = useAvatarReviews({ status, page });
  const decide = useDecideAvatarReview();
  const busyId = decide.isPending ? (decide.variables?.id ?? null) : null;

  /**
   * Manda la decisión. Dos moderadores pueden estar mirando la misma cola: el que llega
   * segundo recibe 404 y no tiene un error que resolver, tiene una fila vieja en pantalla
   * — se lo dice en claro y la invalidación del hook trae la cola al día.
   */
  async function submit(
    review: AvatarReview,
    decision: AvatarReviewDecision,
    note?: string,
  ): Promise<void> {
    try {
      await decide.mutateAsync({ id: review.id, decision, note });
      toast.success(
        decision === 'approve'
          ? `Foto de ${review.user.display_name} aprobada`
          : `Foto de ${review.user.display_name} rechazada y retirada de la app`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RESOURCE_NOT_FOUND') {
        toast.info('Otro moderador ya revisó esta foto. Actualizamos la cola.');
        return;
      }
      throw error;
    }
  }

  const columns = buildColumns({
    canDecide,
    busyId,
    onZoom: setZoomed,
    onApprove: (review) => {
      void submit(review, 'approve').catch((e: Error) => toast.error(e.message));
    },
    onReject: (review) => {
      setZoomed(null);
      setRejectTarget(review);
    },
  });

  const empty = EMPTY_STATE[status];

  return (
    <>
      <DataTable
        toolbar={
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as AvatarReviewStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVATAR_REVIEW_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {AVATAR_REVIEW_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={AVATAR_REVIEW_PAGE_SIZE}
        loading={isLoading}
        onPageChange={setPage}
        emptyIcon={
          isError ? <ImageOffIcon /> : <ShieldCheckIcon className="text-success" />
        }
        emptyMessage={isError ? 'No se pudo cargar la cola de fotos.' : empty.message}
        emptyDescription={
          isError ? 'Reintentá en unos segundos o revisá el estado del backend.' : empty.description
        }
      />

      <Dialog open={!!zoomed} onOpenChange={(open) => !open && setZoomed(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{zoomed?.user.display_name ?? 'Foto de perfil'}</DialogTitle>
            <DialogDescription>
              {zoomed ? `Esperando ${timeAgo(zoomed.waiting_since)} · ${reportsLabel(zoomed)}` : null}
            </DialogDescription>
          </DialogHeader>
          {zoomed && (
            <Image
              src={zoomed.photo_url}
              alt={`Foto de perfil de ${zoomed.user.display_name}`}
              width={640}
              height={640}
              unoptimized
              className="mx-auto h-auto max-h-[60vh] w-auto max-w-full rounded-lg border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title={
          rejectTarget
            ? `Rechazar la foto de ${rejectTarget.user.display_name}`
            : 'Rechazar la foto'
        }
        description={`La foto se retira de amigos, feed, ranking, duelos y arena, se borra del almacenamiento y el usuario vuelve a su avatar anterior. No se puede deshacer. La nota es opcional (máx. ${AVATAR_REVIEW_NOTE_MAX_LENGTH} caracteres) y queda en el historial.`}
        destructive
        requireReason
        reasonMinLength={0}
        confirmLabel="Rechazar foto"
        onConfirm={async ({ reason }) => {
          if (!rejectTarget) return;
          await submit(rejectTarget, 'reject', reason?.trim() || undefined);
        }}
      />
    </>
  );
}
