'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  CircleOffIcon,
  CircleXIcon,
  GripVerticalIcon,
  HandshakeIcon,
  PlusIcon,
  TargetIcon,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSponsors,
  useUpdatePipeline,
  PIPELINE_STATUSES,
  PIPELINE_LABELS,
  type PipelineStatus,
  type Sponsor,
} from '@/hooks/use-sponsors';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';

const ALL = '__all__';

// Icono + color por etapa del pipeline (header de columna). Mismos iconos que el faro del detalle.
const PIPELINE_META: Record<PipelineStatus, { Icon: LucideIcon; color: string }> = {
  prospect: { Icon: TargetIcon, color: 'text-info' },
  active: { Icon: HandshakeIcon, color: 'text-success' },
  lost: { Icon: CircleXIcon, color: 'text-destructive' },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sponsor.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="bg-card rounded-lg border p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="hover:bg-muted text-muted-foreground -ml-1 cursor-grab touch-none rounded p-1"
          aria-label={`Mover ${sponsor.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        {sponsor.logoUrl ? (
          <Image
            src={sponsor.logoUrl}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded object-contain"
            unoptimized
          />
        ) : (
          <div className="bg-muted grid size-7 place-items-center rounded text-xs font-medium">
            {sponsor.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => router.push(`/economy/sponsors/${sponsor.id}`)}
          className="flex-1 text-left"
        >
          <div className="font-medium leading-tight">{sponsor.name}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {sponsor.country ?? 'Multi-país'}
            {sponsor.contactName ? ` · ${sponsor.contactName}` : ''}
          </div>
        </button>
      </div>
      {sponsor.contractEndsAt && (
        <div className="text-muted-foreground mt-2 text-xs">
          Contrato hasta {new Date(sponsor.contractEndsAt).toLocaleDateString('es-CR')}
        </div>
      )}
      {!sponsor.isActive && (
        <StatusBadge tone="muted" icon={CircleOffIcon} label="Inactivo" className="mt-2" />
      )}
    </div>
  );
}

function PipelineColumn({
  status,
  sponsors,
  loading,
}: {
  status: PipelineStatus;
  sponsors: Sponsor[];
  loading: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { Icon, color } = PIPELINE_META[status];
  return (
    <div className="flex min-w-72 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className={cn('size-4', color)} aria-hidden />
          {PIPELINE_LABELS[status]}
        </h2>
        <Badge variant="secondary">{sponsors.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'
        }`}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : sponsors.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">Sin sponsors</p>
        ) : (
          sponsors.map((s) => <SponsorCard key={s.id} sponsor={s} />)
        )}
      </div>
    </div>
  );
}

export function SponsorsBoard() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const { data, isLoading } = useSponsors({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    country: country || undefined,
  });
  const updatePipeline = useUpdatePipeline();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const byStatus = useMemo(() => {
    const groups: Record<PipelineStatus, Sponsor[]> = { prospect: [], active: [], lost: [] };
    for (const s of data?.items ?? []) groups[s.pipelineStatus]?.push(s);
    return groups;
  }, [data]);

  function onDragEnd(e: DragEndEvent): void {
    const target = e.over?.id as PipelineStatus | undefined;
    if (!target || !PIPELINE_STATUSES.includes(target)) return;
    const sponsor = data?.items.find((s) => s.id === e.active.id);
    if (!sponsor || sponsor.pipelineStatus === target) return;
    updatePipeline.mutate(
      { id: sponsor.id, pipelineStatus: target },
      {
        onSuccess: () => toast.success(`${sponsor.name} → ${PIPELINE_LABELS[target]}`),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Buscar sponsor"
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={country || ALL} onValueChange={(v) => setCountry(v === ALL ? '' : v)}>
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
        </div>
        <Button asChild size="sm">
          <Link href="/economy/sponsors/new">
            <PlusIcon className="size-4" />
            Nuevo sponsor
          </Link>
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-4 lg:flex-row">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              sponsors={byStatus[status]}
              loading={isLoading}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
