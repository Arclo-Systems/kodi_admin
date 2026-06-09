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
  UploadIcon,
} from 'lucide-react';
import {
  useCareers,
  useCareerMutations,
  DEMAND_LABELS,
  type Career,
  type CareerListQuery,
} from '@/hooks/use-careers';
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

const columns: ColumnDef<Career, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Carrera',
    meta: { label: 'Carrera' },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        {row.original.area && (
          <span className="text-muted-foreground text-xs">{row.original.area}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'riasecCode',
    header: 'RIASEC',
    meta: { label: 'RIASEC' },
    cell: ({ row }) => <Badge variant="secondary">{row.original.riasecCode}</Badge>,
  },
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  {
    accessorKey: 'demandLevel',
    header: 'Demanda',
    meta: { label: 'Demanda' },
    cell: ({ row }) =>
      row.original.demandLevel ? DEMAND_LABELS[row.original.demandLevel] : '—',
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

export function CareersTable() {
  const router = useRouter();
  const [query, setQuery] = useState<CareerListQuery>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useCareers(query);
  const set = (patch: Partial<CareerListQuery>) => setQuery({ ...query, page: 1, ...patch });

  const cols = useMemo<ColumnDef<Career, unknown>[]>(
    () => [
      ...columns,
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <CareerRowActions career={row.original} />,
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
          <Button asChild size="sm" variant="outline">
            <Link href="/content/careers/uploads">
              <UploadIcon className="size-4" />
              Subidas masivas
            </Link>
          </Button>
          {/* Slot donde el DataTable porta "Columnas". */}
          <div id="careers-table-toolbar" className="flex items-center gap-2" />
          <Button asChild size="sm">
            <Link href="/content/careers/new">
              <PlusIcon className="size-4" />
              Nueva carrera
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
        onRowClick={(c) => router.push(`/content/careers/${c.id}/edit`)}
        toolbarPortalId="careers-table-toolbar"
        emptyMessage="No hay carreras con esos filtros"
      />
    </div>
  );
}

// Acciones inline (convención de fila): Editar ghost neutro · Desactivar text-destructive / Activar text-success. El form es largo → página (U6).
function CareerRowActions({ career }: { career: Career }) {
  const { update } = useCareerMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/content/careers/${career.id}/edit`}>
          <PencilIcon className="size-3.5" />
          Editar
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={
          career.isActive
            ? 'text-destructive hover:text-destructive'
            : 'text-success hover:text-success'
        }
        onClick={() => setConfirmOpen(true)}
      >
        {career.isActive ? (
          <PowerOffIcon className="size-3.5" />
        ) : (
          <PowerIcon className="size-3.5" />
        )}
        {career.isActive ? 'Desactivar' : 'Activar'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={career.isActive ? 'Desactivar carrera' : 'Activar carrera'}
        description={
          career.isActive
            ? 'La carrera dejará de aparecer en el test vocacional.'
            : 'La carrera volverá a aparecer en el test vocacional.'
        }
        destructive={career.isActive}
        confirmLabel={career.isActive ? 'Desactivar' : 'Activar'}
        onConfirm={async () => {
          await update.mutateAsync({ id: career.id, input: { isActive: !career.isActive } });
          toast.success(career.isActive ? 'Carrera desactivada' : 'Carrera activada');
        }}
      />
    </div>
  );
}
