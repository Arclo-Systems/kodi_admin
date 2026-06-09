'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CircleCheckIcon, CircleOffIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  useSponsorBranches,
  useSponsorBranchMutations,
  type SponsorBranch,
} from '@/hooks/use-sponsors';
import { COUNTRIES } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/lib/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

export function SponsorBranchesTab({ sponsorId }: { sponsorId: string }) {
  const { data: branches, isLoading } = useSponsorBranches(sponsorId);
  const { remove } = useSponsorBranchMutations(sponsorId);
  const [toDelete, setToDelete] = useState<SponsorBranch | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`/economy/sponsors/${sponsorId}/branches/new`}>
            <PlusIcon className="size-4" />
            Agregar sucursal
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (branches?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">Sin sucursales todavía.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Cupones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches!.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.label}</TableCell>
                <TableCell>
                  {b.country} · {countryLabel(b.country)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {b.address ?? '—'}
                </TableCell>
                <TableCell>{b._count?.couponBranches ?? 0}</TableCell>
                <TableCell>
                  {b.isActive ? (
                    <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
                  ) : (
                    <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactiva" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/economy/sponsors/${sponsorId}/branches/${b.id}/edit`}>
                      <PencilIcon className="size-3.5" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setToDelete(b)}
                  >
                    <Trash2Icon className="size-3.5" />
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar sucursal"
        description="Solo se puede borrar si no está asignada a cupones."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            toast.success('Sucursal eliminada');
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}
