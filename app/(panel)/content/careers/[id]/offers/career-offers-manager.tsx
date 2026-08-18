'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge } from '@/lib/status-badge';
import { SponsorshipBadge } from '@/lib/sponsorship';
import { moveItem } from '@/lib/reorder';
import { useCareer } from '@/hooks/use-careers';
import {
  OFFER_MODALITY_LABEL,
  useCareerOfferMutations,
  useCareerOffers,
  type CareerOffer,
} from '@/hooks/use-career-offers';
import { CareerOfferDialog } from './career-offer-dialog';
import { CareerOffersUploadDialog } from './career-offers-upload-dialog';
import { formatCampuses } from './career-offers-model';

const DASH = <span className="text-muted-foreground">—</span>;
const orNothing = (value: string | null) => (value ? <span>{value}</span> : DASH);

export function CareerOffersManager({ careerId }: { careerId: string }) {
  const { data: career } = useCareer(careerId);
  const { data: offers, isLoading, isError } = useCareerOffers(careerId);
  const { remove, reorder } = useCareerOfferMutations(careerId);
  const [editing, setEditing] = useState<CareerOffer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CareerOffer | null>(null);

  const items = offers ?? [];

  function move(index: number, delta: number): void {
    const next = moveItem(items, index, delta);
    reorder.mutate(
      next.map((o) => o.id),
      { onError: (e: Error) => toast.error(e.message) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {career ? `${career.name} · ${career.country}` : 'Cargando carrera…'}
        </p>
        <div className="flex items-center gap-2">
          <CareerOffersUploadDialog country={career?.country} />
          <Button size="sm" onClick={() => setCreating(true)} disabled={!career}>
            <PlusIcon className="size-4" />
            Nueva oferta
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm">No se pudieron cargar las ofertas.</p>
      ) : items.length === 0 ? (
        <EmptyState
          message="Sin universidades privadas"
          description="Agregá una oferta o importá varias por CSV. Aparecen en la app debajo de las públicas con corte."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Orden</TableHead>
                <TableHead>Universidad</TableHead>
                <TableHead>Sedes</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Patrocinio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((offer, index) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Subir ${offer.university.name}`}
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUpIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Bajar ${offer.university.name}`}
                        disabled={index === items.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDownIcon className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{offer.university.name}</span>
                      <span className="flex items-center gap-1">
                        <Badge variant="secondary">{offer.university.code}</Badge>
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLinkIcon className="size-3" aria-hidden />
                          Enlace
                        </a>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56">
                    {offer.campuses.length ? formatCampuses(offer.campuses) : DASH}
                  </TableCell>
                  <TableCell>
                    {offer.modality ? OFFER_MODALITY_LABEL[offer.modality] : DASH}
                  </TableCell>
                  <TableCell>{orNothing(offer.durationText)}</TableCell>
                  <TableCell>{orNothing(offer.scheduleText)}</TableCell>
                  <TableCell>{orNothing(offer.costText)}</TableCell>
                  <TableCell>
                    <SponsorshipBadge sponsorship={offer.university} />
                  </TableCell>
                  <TableCell>
                    {offer.isActive ? (
                      <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
                    ) : (
                      <StatusBadge tone="muted" icon={CircleDashedIcon} label="Inactiva" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(offer)}>
                        <PencilIcon className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(offer)}
                      >
                        <Trash2Icon className="size-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {career && (creating || editing) && (
        <CareerOfferDialog
          careerId={careerId}
          country={career.country}
          offer={editing}
          takenUniversityIds={items.map((o) => o.university.id)}
          open
          onOpenChange={(open) => {
            if (open) return;
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar oferta"
        description={
          deleting
            ? `«${deleting.university.name}» dejará de aparecer en el detalle de esta carrera. Las métricas ya registradas se pierden.`
            : ''
        }
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success('Oferta eliminada');
          setDeleting(null);
        }}
      />
    </div>
  );
}
