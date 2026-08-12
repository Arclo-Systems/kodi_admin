import { CheckCircle2Icon, CircleDashedIcon, MicIcon, PencilLineIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PieceState, PodcastState } from '@/hooks/use-review-material';

type AnyState = PieceState | PodcastState;

// Estado nunca solo por color (U5): cada uno lleva su etiqueta y su icono.
const LABELS: Record<AnyState, string> = {
  empty: 'Sin material',
  draft: 'Borrador',
  script_approved: 'Guión aprobado',
  audio_ready: 'Audio listo',
  published: 'Publicado',
};

const TONES: Record<AnyState, string> = {
  empty: 'text-muted-foreground border-dashed',
  draft: 'border-warning/40 bg-warning/10 text-warning',
  script_approved: 'border-info/40 bg-info/10 text-info',
  audio_ready: 'border-info/40 bg-info/10 text-info',
  published: 'border-success/40 bg-success/10 text-success',
};

const ICONS: Record<AnyState, typeof CheckCircle2Icon> = {
  empty: CircleDashedIcon,
  draft: PencilLineIcon,
  script_approved: PencilLineIcon,
  audio_ready: MicIcon,
  published: CheckCircle2Icon,
};

export function PieceBadge({ state, suffix }: { state: AnyState; suffix?: string }) {
  const Icon = ICONS[state];
  return (
    <Badge variant="outline" className={TONES[state]}>
      <Icon className="size-3" aria-hidden />
      {LABELS[state]}
      {suffix ? ` · ${suffix}` : ''}
    </Badge>
  );
}
