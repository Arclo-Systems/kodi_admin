'use client';

import {
  ArrowRightLeftIcon,
  CalendarClockIcon,
  CircleCheckIcon,
  FileTextIcon,
  PaperclipIcon,
  ReceiptIcon,
  SendIcon,
  SparklesIcon,
  StickyNoteIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import { useSponsorActivities } from '@/hooks/use-sponsors';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Icono + chip tintado por tipo de actividad (los `type` los emite el backend del CRM de sponsors).
const TYPE_META: Record<string, { icon: LucideIcon; chip: string }> = {
  created: { icon: SparklesIcon, chip: 'bg-primary/10 text-primary' },
  pipeline_changed: { icon: ArrowRightLeftIcon, chip: 'bg-info/10 text-info' },
  note_added: { icon: StickyNoteIcon, chip: 'bg-muted text-muted-foreground' },
  note_removed: { icon: Trash2Icon, chip: 'bg-muted text-muted-foreground' },
  document_added: { icon: PaperclipIcon, chip: 'bg-muted text-muted-foreground' },
  document_removed: { icon: Trash2Icon, chip: 'bg-muted text-muted-foreground' },
  contract_expiring: { icon: CalendarClockIcon, chip: 'bg-warning/10 text-warning' },
  invoice_created: { icon: ReceiptIcon, chip: 'bg-info/10 text-info' },
  invoice_issued: { icon: SendIcon, chip: 'bg-info/10 text-info' },
  invoice_paid: { icon: CircleCheckIcon, chip: 'bg-success/10 text-success' },
  invoice_overdue: { icon: TriangleAlertIcon, chip: 'bg-destructive/10 text-destructive' },
};
const FALLBACK = { icon: FileTextIcon, chip: 'bg-muted text-muted-foreground' };

function metaFor(type: string): { icon: LucideIcon; chip: string } {
  return TYPE_META[type] ?? FALLBACK;
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SponsorTimelineTab({ sponsorId }: { sponsorId: string }) {
  const { data: activities, isLoading } = useSponsorActivities(sponsorId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if ((activities?.length ?? 0) === 0) {
    return <p className="text-muted-foreground text-sm">Sin actividad registrada.</p>;
  }

  return (
    <ol>
      {activities!.map((a, i) => {
        const meta = metaFor(a.type);
        const Icon = meta.icon;
        const isLast = i === activities!.length - 1;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-4',
                  meta.chip,
                )}
              >
                <Icon aria-hidden />
              </span>
              {!isLast && <span className="bg-border w-px flex-1" aria-hidden />}
            </div>
            <div className="min-w-0 pb-6">
              <p className="text-sm font-medium">{a.summary}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{fmtDateTime(a.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
