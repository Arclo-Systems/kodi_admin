'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTablePagination } from '@/components/admin/data-table-pagination';
import { can } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';
import { useQuestion, type QuestionListItem, type QuestionStatus } from '@/hooks/use-questions';
import { useQuestionsBulk, type QuestionBulkStatus } from '@/hooks/use-content-bulk';
import { QuestionDifficulty, QuestionStatusBadge } from '@/lib/question-status';
import { QuestionPreview } from '../question-preview';
import { QUESTIONS_REVIEW_KEY } from '../questions-bulk-bar';

const PAGE_SIZE = 50;
const STATE_ORDER: QuestionStatus[] = ['draft', 'review', 'active', 'inactive'];

type ActionDef = {
  key: string;
  label: string;
  icon: ReactNode;
  toStatus: QuestionBulkStatus;
  destructive?: boolean;
  recovery?: boolean;
};
type PendingAction = {
  label: string;
  ids: string[];
  status: QuestionBulkStatus;
  destructive?: boolean;
};

// Transiciones válidas por estado: la acción ofrecida queda condicionada al estado real.
// El endpoint bulk-status es admin-only (@RequireRole(admin) en el backend), así que TODAS
// las transiciones en lote requieren esa capacidad; sin ella no se ofrece ninguna acción.
function actionsForStatus(status: QuestionStatus, canManage: boolean): ActionDef[] {
  if (!canManage) return [];
  switch (status) {
    case 'draft':
      return [
        { key: 'submit', label: 'Enviar a revisión', icon: <SendIcon className="size-4" />, toStatus: 'review' },
      ];
    case 'review':
      return [
        { key: 'approve', label: 'Aprobar', icon: <CheckIcon className="size-4" />, toStatus: 'active' },
        {
          key: 'reject',
          label: 'Rechazar',
          icon: <XIcon className="size-4" />,
          toStatus: 'draft',
          destructive: true,
        },
      ];
    case 'active':
      return [
        {
          key: 'deactivate',
          label: 'Desactivar',
          icon: <BanIcon className="size-4" />,
          toStatus: 'inactive',
          destructive: true,
        },
      ];
    case 'inactive':
      return [
        {
          key: 'activate',
          label: 'Activar',
          icon: <RotateCcwIcon className="size-4" />,
          toStatus: 'active',
          recovery: true,
        },
      ];
  }
}

export function ReviewSelected({ role }: { role: AdminRole }) {
  const router = useRouter();
  const { setStatus } = useQuestionsBulk();
  // bulk-status es admin-only en el backend; espejamos esa capacidad con el único permiso
  // de contenido admin-only del matrix. No es boundary de seguridad (el server manda).
  const canManageWorkflow = can(role, 'content:question:activate');

  const [items, setItems] = useState<QuestionListItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [cardIdx, setCardIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    void (async () => {
      const raw = sessionStorage.getItem(QUESTIONS_REVIEW_KEY);
      const parsed = raw ? (JSON.parse(raw) as QuestionListItem[]) : [];
      setItems(parsed);
      setSelected(new Set(parsed.map((i) => i.id)));
    })();
  }, []);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items === null) return <Skeleton className="h-48 w-full" />;
  if (items.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border py-12 text-center">
        <p className="text-muted-foreground text-sm">
          No hay preguntas para revisar. Volvé y seleccioná algunas en la lista.
        </p>
        <Button variant="outline" onClick={() => router.push('/content/questions')}>
          <ArrowLeftIcon className="size-4" /> Volver a Preguntas
        </Button>
      </div>
    );
  }

  const byStatus: Record<QuestionStatus, string[]> = {
    draft: [],
    review: [],
    active: [],
    inactive: [],
  };
  items.forEach((i) => {
    if (selected.has(i.id)) byStatus[i.status].push(i.id);
  });
  const groups = STATE_ORDER.map((status) => ({ status, ids: byStatus[status] })).filter(
    (g) => g.ids.length > 0,
  );

  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allSelected = selected.size === items.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">
          {selected.size} de {items.length} seleccionadas
        </span>
        <Button variant="outline" onClick={() => router.push('/content/questions')}>
          <ArrowLeftIcon className="size-4" /> Cancelar
        </Button>
      </div>

      {groups.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          {groups.map((g, i) => {
            const acts = actionsForStatus(g.status, canManageWorkflow);
            return (
              <div
                key={g.status}
                className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 ${
                  i > 0 ? 'border-t' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <QuestionStatusBadge status={g.status} />
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {g.ids.length} {g.ids.length === 1 ? 'pregunta' : 'preguntas'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {acts.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Sin acción para tu rol</span>
                  ) : (
                    acts.map((a) => (
                      <Button
                        key={a.key}
                        variant={a.destructive || a.recovery ? 'outline' : 'default'}
                        className={
                          a.destructive
                            ? 'text-destructive hover:text-destructive'
                            : a.recovery
                              ? 'text-success hover:text-success'
                              : undefined
                        }
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setPending({
                            label: a.label,
                            ids: g.ids,
                            status: a.toStatus,
                            destructive: a.destructive,
                          })
                        }
                      >
                        {a.icon}
                        {a.label}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          Seleccioná al menos una pregunta para ver las acciones disponibles.
        </p>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'cards')}>
        <TabsList>
          <TabsTrigger value="table">Tabla</TabsTrigger>
          <TabsTrigger value="cards">Vista de pregunta</TabsTrigger>
        </TabsList>

        {view === 'table' ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allSelected ? true : selected.size === 0 ? false : 'indeterminate'
                        }
                        onCheckedChange={() =>
                          setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
                        }
                        aria-label="Seleccionar todas"
                      />
                    </TableHead>
                    <TableHead>Enunciado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Dificultad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(q.id)}
                          onCheckedChange={() => toggle(q.id)}
                          aria-label={`Incluir ${q.text.slice(0, 30)}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-md truncate">{q.text}</TableCell>
                      <TableCell>
                        <QuestionStatusBadge status={q.status} />
                      </TableCell>
                      <TableCell>
                        <QuestionDifficulty difficulty={q.difficulty} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {items.length > PAGE_SIZE && (
              <DataTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={items.length}
                onPageChange={setPage}
              />
            )}
          </div>
        ) : (
          <CardView
            items={items}
            cardIdx={cardIdx}
            setCardIdx={setCardIdx}
            selected={selected}
            onToggle={toggle}
          />
        )}
      </Tabs>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        destructive={pending?.destructive}
        title={pending ? `${pending.label} (${pending.ids.length})` : ''}
        description={
          pending
            ? `Se aplicará "${pending.label}" a ${pending.ids.length} pregunta(s) seleccionada(s).`
            : ''
        }
        confirmLabel={pending?.label}
        onConfirm={async () => {
          if (!pending) return;
          try {
            const r = await setStatus.mutateAsync({ ids: pending.ids, status: pending.status });
            toast.success(`${r.updated} preguntas actualizadas`);
            sessionStorage.removeItem(QUESTIONS_REVIEW_KEY);
            router.push('/content/questions');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo aplicar la acción');
          }
        }}
      />
    </div>
  );
}

function CardView({
  items,
  cardIdx,
  setCardIdx,
  selected,
  onToggle,
}: {
  items: QuestionListItem[];
  cardIdx: number;
  setCardIdx: (updater: (i: number) => number) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const current = items[cardIdx];
  const { data: detail, isLoading } = useQuestion(current?.id ?? '');

  if (!current) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={selected.has(current.id)}
            onCheckedChange={() => onToggle(current.id)}
            aria-label="Incluir esta pregunta"
          />
          Incluir esta pregunta
        </label>
        <div className="flex items-center gap-2">
          <QuestionStatusBadge status={current.status} />
          <span className="text-muted-foreground text-sm tabular-nums">
            {cardIdx + 1} / {items.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Anterior"
            disabled={cardIdx === 0}
            onClick={() => setCardIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Siguiente"
            disabled={cardIdx >= items.length - 1}
            onClick={() => setCardIdx((i) => Math.min(items.length - 1, i + 1))}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
      {isLoading || !detail ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <QuestionPreview
          text={detail.text}
          options={detail.options}
          correctOptionId={detail.correctOptionId}
          showAnswer
          explanation={detail.explanation ?? undefined}
        />
      )}
    </div>
  );
}
