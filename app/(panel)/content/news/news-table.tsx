'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import {
  useNews,
  type NewsCategory,
  type NewsListItem,
  type NewsListQuery,
  type NewsStatus,
} from '@/hooks/use-news';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewsStatusBadge } from '@/lib/news-status';
import { NewsBulkBar } from './news-bulk-bar';

const ALL = '__all__';

const columns: ColumnDef<NewsListItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
    meta: { label: 'Título' },
    cell: ({ row }) => <div className="max-w-md truncate font-medium">{row.original.title}</div>,
  },
  { accessorKey: 'country', header: 'País', meta: { label: 'País' } },
  {
    accessorKey: 'category',
    header: 'Categoría',
    meta: { label: 'Categoría' },
    cell: ({ row }) => (row.original.category === 'module' ? 'Módulo' : 'Educación'),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <NewsStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'publishedAt',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => new Date(row.original.publishedAt).toLocaleDateString('es'),
  },
];

export function NewsTable() {
  const router = useRouter();
  const [query, setQuery] = useState<NewsListQuery>({ page: 1, pageSize: 20 });
  const [selected, setSelected] = useState<NewsListItem[]>([]);
  const [tableKey, setTableKey] = useState(0);
  const { data, isLoading } = useNews(query);
  const set = (patch: Partial<NewsListQuery>) => setQuery({ ...query, page: 1, ...patch });

  function clearSelection(): void {
    setSelected([]);
    setTableKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Select
            value={query.status ?? ALL}
            onValueChange={(v) => set({ status: v === ALL ? undefined : (v as NewsStatus) })}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="scheduled">Programada</SelectItem>
              <SelectItem value="published">Publicada</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={query.category ?? ALL}
            onValueChange={(v) => set({ category: v === ALL ? undefined : (v as NewsCategory) })}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectItem value="module">Módulo</SelectItem>
              <SelectItem value="education">Educación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {/* Slot donde el DataTable porta "Columnas" para compartir esta línea. */}
          <div id="news-table-toolbar" className="flex items-center gap-2" />
          <Button asChild size="sm">
            <Link href="/content/news/new">
              <PlusIcon className="size-4" />
              Nueva noticia
            </Link>
          </Button>
        </div>
      </div>
      {selected.length > 0 && (
        <NewsBulkBar ids={selected.map((n) => n.id)} onDone={clearSelection} />
      )}
      <DataTable
        key={tableKey}
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        loading={isLoading}
        enableSelection
        getRowId={(n) => n.id}
        onSelectionChange={setSelected}
        onPageChange={(page) => setQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
        onRowClick={(n) => router.push(`/content/news/${n.id}`)}
        toolbarPortalId="news-table-toolbar"
        emptyMessage="No hay noticias con esos filtros"
      />
    </div>
  );
}
