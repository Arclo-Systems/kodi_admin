import {
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@/lib/status-badge';
import type { InvoiceStatus } from '@/hooks/use-sponsor-invoices';

// Faro de estado de factura (única fuente; lo usan el tab del sponsor y el detalle de factura).
export const INVOICE_STATUS_FARO: Record<InvoiceStatus, { tone: StatusTone; icon: LucideIcon }> = {
  draft: { tone: 'muted', icon: CircleDashedIcon },
  issued: { tone: 'info', icon: SendIcon },
  paid: { tone: 'success', icon: CircleCheckIcon },
  overdue: { tone: 'destructive', icon: ClockIcon },
  void: { tone: 'muted', icon: BanIcon },
};
