'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CircleCheckIcon,
  CircleDashedIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
} from 'lucide-react';
import {
  useUniversities,
  useUniversityMutations,
  type University,
  type UniversityListQuery,
} from '@/hooks/use-universities';
import { DataTable } from '@/components/admin/data-table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';

const ALL = '__all__';

const pct = (w: string): string => `${Math.round(Number(w) * 100)}%`;

const columns: ColumnDef<University, unknown>[] = [
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  {
    accessorKey: 'code',
    header: 'Código',
    meta: { label: 'Código' },
    cell: ({ row }) => <Badge variant="secondary">{row.original.code}</Badge>,
  },
  {
    accessorKey: 'name',
    header: 'Nombre',
    meta: { label: 'Nombre' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: 'weights',
    header: 'Pesos',
    meta: { label: 'Pesos' },
    cell: ({ row }) => (
      <span>
        {pct(row.original.examWeight)} / {pct(row.original.presentationWeight)}
      </span>
    ),
  },
  {
    id: 'scale',
    header: 'Escala',
    meta: { label: 'Escala' },
    cell: ({ row }) => (
      <span>
        {row.original.scaleMin}–{row.original.scaleMax}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success" icon={CircleCheckIcon} label="Activa" />
      ) : (
        <StatusBadge tone="muted" icon={CircleDashedIcon} label="Inactiva" />
      ),
  },
];

export function UniversitiesTable() {
  const router = useRouter();
  const [query, setQuery] = useState<UniversityListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useUniversities(query);
  const set = (patch: Partial<UniversityListQuery>) => setQuery({ ...query, page: 1, ...patch });

  const cols = useMemo<ColumnDef<University, unknown>[]>(
    () => [
      ...columns,
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <UniversityRowActions university={row.original} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Select
            value={query.country ?? ALL}
            onValueChange={(v) => set({ country: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por país">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los países</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.isActive === undefined ? ALL : query.isActive ? 'true' : 'false'}
            onValueChange={(v) => set({ isActive: v === ALL ? undefined : v === 'true' })}
          >
            <SelectTrigger className="w-32" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectItem value="true">Activas</SelectItem>
              <SelectItem value="false">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {/* Slot donde el DataTable porta "Columnas". */}
          <div id="universities-table-toolbar" className="flex items-center gap-2" />
          <Button asChild size="sm">
            <Link href="/content/universities/new">
              <PlusIcon className="size-4" />
              Nueva universidad
            </Link>
          </Button>
        </div>
      </div>
      <DataTable
        columns={cols}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        loading={isLoading}
        onPageChange={(page) => setQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
        onRowClick={(u) => router.push(`/content/universities/${u.id}/edit`)}
        toolbarPortalId="universities-table-toolbar"
        emptyMessage="No hay universidades con esos filtros"
      />
    </div>
  );
}

// Acciones inline (convención de fila): Editar ghost neutro · Desactivar text-destructive / Activar text-success.
function UniversityRowActions({ university }: { university: University }) {
  const { update } = useUniversityMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/content/universities/${university.id}/edit`}>
          <PencilIcon className="size-3.5" />
          Editar
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={
          university.isActive
            ? 'text-destructive hover:text-destructive'
            : 'text-success hover:text-success'
        }
        onClick={() => setConfirmOpen(true)}
      >
        {university.isActive ? (
          <PowerOffIcon className="size-3.5" />
        ) : (
          <PowerIcon className="size-3.5" />
        )}
        {university.isActive ? 'Desactivar' : 'Activar'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={university.isActive ? 'Desactivar universidad' : 'Activar universidad'}
        description={
          university.isActive
            ? 'La universidad dejará de usarse en el cálculo de nota de admisión.'
            : 'La universidad volverá a usarse en el cálculo de nota de admisión.'
        }
        destructive={university.isActive}
        confirmLabel={university.isActive ? 'Desactivar' : 'Activar'}
        onConfirm={async () => {
          await update.mutateAsync({
            id: university.id,
            input: { isActive: !university.isActive },
          });
          toast.success(university.isActive ? 'Universidad desactivada' : 'Universidad activada');
        }}
      />
    </div>
  );
}
