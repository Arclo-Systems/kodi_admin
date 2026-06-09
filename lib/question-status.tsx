import {
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import type { Difficulty, QuestionStatus } from '@/hooks/use-questions';

// Faro de estados de pregunta. Solo datos; la presentación la define StatusBadge.
export const QUESTION_STATUS_META: Record<
  QuestionStatus,
  { label: string; icon: LucideIcon; tone: StatusTone }
> = {
  draft: { label: 'Borrador', icon: CircleDashedIcon, tone: 'muted' },
  review: { label: 'En revisión', icon: ClockIcon, tone: 'info' },
  active: { label: 'Activa', icon: CircleCheckIcon, tone: 'success' },
  inactive: { label: 'Inactiva', icon: BanIcon, tone: 'destructive' },
};

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const m = QUESTION_STATUS_META[status];
  return <StatusBadge tone={m.tone} icon={m.icon} label={m.label} />;
}

// Dificultad con punto tipo semáforo (verde/ámbar/rojo). El texto lleva el significado;
// el punto es refuerzo visual (decorativo).
const DIFFICULTY_META: Record<Difficulty, { label: string; dot: string }> = {
  easy: { label: 'Fácil', dot: 'bg-success' },
  medium: { label: 'Media', dot: 'bg-warning' },
  hard: { label: 'Difícil', dot: 'bg-destructive' },
};

export function QuestionDifficulty({ difficulty }: { difficulty: Difficulty }) {
  const m = DIFFICULTY_META[difficulty];
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
