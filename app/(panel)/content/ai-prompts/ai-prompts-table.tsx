'use client';

import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useAiPrompts, type AiPromptListItem } from '@/hooks/use-ai-prompts';
import { DataTable } from '@/components/admin/data-table';
import { ActivePromptBadge } from '@/lib/ai-prompt-status';

const columns: ColumnDef<AiPromptListItem, unknown>[] = [
  {
    accessorKey: 'key',
    header: 'Key',
    meta: { label: 'Key' },
    cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
  },
  {
    accessorKey: 'country',
    header: 'Scope',
    meta: { label: 'Scope' },
    cell: ({ row }) => row.original.country ?? 'Global',
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    meta: { label: 'Descripción' },
    cell: ({ row }) => <div className="max-w-md truncate">{row.original.description}</div>,
  },
  {
    id: 'versions',
    header: 'Versiones',
    meta: { label: 'Versiones' },
    cell: ({ row }) => row.original._count.versions,
  },
  {
    id: 'active',
    header: 'Activa',
    meta: { label: 'Activa' },
    cell: ({ row }) => <ActivePromptBadge active={!!row.original.activeVersionId} />,
  },
];

export function AiPromptsTable() {
  const router = useRouter();
  const { data, isLoading } = useAiPrompts();
  const items = data ?? [];

  return (
    <DataTable
      toolbar={<div className="ml-auto" aria-hidden />}
      columns={columns}
      data={items}
      total={items.length}
      page={1}
      pageSize={Math.max(items.length, 1)}
      loading={isLoading}
      onPageChange={() => {}}
      onRowClick={(p) => router.push(`/content/ai-prompts/${p.id}`)}
      emptyMessage="No hay prompts"
    />
  );
}
