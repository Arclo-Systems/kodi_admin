import { CircleCheckIcon, CircleDashedIcon } from 'lucide-react';
import { StatusBadge } from '@/lib/status-badge';

// Faro de "versión activa" de un prompt: activa (verde) vs sin activar (neutral).
export function ActivePromptBadge({ active, label }: { active: boolean; label?: string }) {
  return active ? (
    <StatusBadge tone="success" icon={CircleCheckIcon} label={label ?? 'Activa'} />
  ) : (
    <StatusBadge tone="muted" icon={CircleDashedIcon} label={label ?? 'Sin activar'} />
  );
}
