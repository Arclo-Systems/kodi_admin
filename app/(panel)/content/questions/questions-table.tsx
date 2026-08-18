'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, LockIcon, PlusIcon } from 'lucide-react';
import {
  useQuestions,
  type GenerationSource,
  type QuestionListItem,
  type QuestionListQuery,
} from '@/hooks/use-questions';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import {
  parseQuestionListQuery,
  serializeQuestionListQuery,
} from '@/lib/question-list-query-url';
import { QuestionDifficulty, QuestionStatusBadge } from '@/lib/question-status';
import { StatusBadge } from '@/lib/status-badge';
import { QuestionFilters } from './question-filters';
import { AiGenerateDialog } from './ai-generate-dialog';
import { QuestionsImportDialog } from './questions-import-dialog';
import { QuestionsBulkBar } from './questions-bulk-bar';

const SOURCE_L: Record<GenerationSource, string> = {
  manual: 'Manual',
  csv_import: 'CSV',
  ai_generated: 'IA',
};

const columns: ColumnDef<QuestionListItem, unknown>[] = [
  {
    accessorKey: 'text',
    header: 'Pregunta',
    meta: { label: 'Pregunta' },
    cell: ({ row }) => <div className="max-w-md truncate">{row.original.text}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    cell: ({ row }) => <QuestionStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'difficulty',
    header: 'Dificultad',
    meta: { label: 'Dificultad' },
    cell: ({ row }) => <QuestionDifficulty difficulty={row.original.difficulty} />,
  },
  {
    accessorKey: 'generationSource',
    header: 'Origen',
    meta: { label: 'Origen' },
    cell: ({ row }) => SOURCE_L[row.original.generationSource],
  },
  {
    accessorKey: 'isDemoPool',
    header: 'Mazo',
    meta: { label: 'Mazo' },
    cell: ({ row }) =>
      row.original.isDemoPool ? (
        <StatusBadge tone="warning" icon={EyeIcon} label="Demo público" />
      ) : (
        <StatusBadge tone="muted" icon={LockIcon} label="Banco" />
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creada',
    meta: { label: 'Creada' },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es'),
  },
];

const LIST_PATH = '/content/questions';
const FILTERS_STORAGE_KEY = 'kodi-admin:questions:filters';

// La URL es la fuente de verdad (atrás y recargar conservan todo), pero varias
// pantallas vuelven con `router.push('/content/questions')` pelado; el espejo en
// localStorage es lo que hace que esos regresos no pierdan el filtro. Va en
// localStorage y no en sessionStorage porque el filtro solo se pierde al
// limpiarlo: sobrevive a cerrar la pestaña y al navegador.
function readStoredFilters(): string | null {
  try {
    return localStorage.getItem(FILTERS_STORAGE_KEY);
  } catch {
    // Storage bloqueado (modo privado / cookies off): se pierde la memoria, no el panel.
    return null;
  }
}

function writeStoredFilters(qs: string): void {
  try {
    if (qs) localStorage.setItem(FILTERS_STORAGE_KEY, qs);
    else localStorage.removeItem(FILTERS_STORAGE_KEY);
  } catch {
    // Ídem: no poder recordar el filtro nunca debe romper el filtrado.
  }
}

export function QuestionsTable({ role }: { role: AdminRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const query = useMemo(() => parseQuestionListQuery(new URLSearchParams(search)), [search]);
  const [selected, setSelected] = useState<QuestionListItem[]>([]);
  const [tableKey, setTableKey] = useState(0);
  const { data, isLoading } = useQuestions(query);

  const setQuery = useCallback(
    (next: QuestionListQuery) => {
      const qs = serializeQuestionListQuery(next);
      writeStoredFilters(qs);
      router.replace(qs ? `${LIST_PATH}?${qs}` : LIST_PATH, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (search) return;
    const stored = readStoredFilters();
    if (stored) router.replace(`${LIST_PATH}?${stored}`, { scroll: false });
  }, [search, router]);
  // Las acciones en lote (bulk-status / bulk-delete) son admin-only en el backend;
  // sin esa capacidad no tiene sentido ofrecer selección.
  const canManage = can(role, 'content:question:activate');

  function clearSelection(): void {
    setSelected([]);
    setTableKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuestionFilters value={query} onChange={setQuery} />
        <div className="flex shrink-0 gap-2">
          <AiGenerateDialog />
          <QuestionsImportDialog />
          {/* Slot donde el DataTable porta su "Columnas" para compartir esta línea. */}
          <div id="questions-table-toolbar" className="flex items-center gap-2" />
          <Button asChild size="sm">
            <Link href="/content/questions/new">
              <PlusIcon className="size-4" />
              Nueva
            </Link>
          </Button>
        </div>
      </div>
      {selected.length > 0 && <QuestionsBulkBar items={selected} onDone={clearSelection} />}
      <DataTable
        key={tableKey}
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        loading={isLoading}
        enableSelection={canManage}
        getRowId={(q) => q.id}
        onSelectionChange={setSelected}
        onPageChange={(page) => setQuery({ ...query, page })}
        onPageSizeChange={(pageSize) => setQuery({ ...query, page: 1, pageSize })}
        onRowClick={(q) => router.push(`/content/questions/${q.id}`)}
        toolbarPortalId="questions-table-toolbar"
        emptyMessage="No hay preguntas con esos filtros"
      />
    </div>
  );
}
