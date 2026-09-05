import {
  ArrowLeftRightIcon,
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  HandCoinsIcon,
  LandmarkIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/lib/status-badge';
import {
  MOVEMENT_TYPE_LABELS,
  type FinanceEntryStatus,
  type MovementType,
} from '@/hooks/use-finance';

// Ingreso y gasto se distinguen por color porque son los únicos que mueven el
// P&L; los tres que solo mueven caja comparten el gris para no competir con ellos.
const TYPE_STYLE: Record<MovementType, { tone: StatusTone; icon: LucideIcon }> = {
  INCOME: { tone: 'success', icon: TrendingUpIcon },
  EXPENSE: { tone: 'warning', icon: TrendingDownIcon },
  TRANSFER: { tone: 'info', icon: ArrowLeftRightIcon },
  PARTNER_CONTRIBUTION: { tone: 'neutral', icon: HandCoinsIcon },
  PARTNER_LOAN: { tone: 'neutral', icon: LandmarkIcon },
  OTHER: { tone: 'muted', icon: CircleDashedIcon },
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { tone, icon } = TYPE_STYLE[type];
  return <StatusBadge tone={tone} icon={icon} label={MOVEMENT_TYPE_LABELS[type]} />;
}

export function EntryStatusBadge({ status }: { status: FinanceEntryStatus }) {
  return status === 'VOIDED' ? (
    <StatusBadge tone="destructive" icon={BanIcon} label="Anulado" />
  ) : (
    <StatusBadge tone="success" icon={CircleCheckIcon} label="Activo" />
  );
}
