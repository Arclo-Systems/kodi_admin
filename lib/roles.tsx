import { Badge } from '@/components/ui/badge';
import type { AdminRole } from '@/lib/auth';

// Color secundario por rol (paleta DESIGN): teal · cielo · dorado · durazno.
// Fuente única para el badge de rol (tabla de admins + menú de usuario).
export const ROLE_META: Record<AdminRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#408D99' },
  editor: { label: 'Editor', color: '#5DB7E8' },
  support: { label: 'Soporte', color: '#E3B23C' },
  commercial: { label: 'Comercial', color: '#F6B38E' },
};

const FALLBACK = { label: '—', color: '#7C8698' };

export function RoleBadge({ role }: { role: string }) {
  const r = ROLE_META[role as AdminRole] ?? { ...FALLBACK, label: role };
  return (
    <Badge
      variant="outline"
      style={{
        borderColor: `${r.color}66`,
        backgroundColor: `${r.color}22`,
        color: r.color,
      }}
    >
      {r.label}
    </Badge>
  );
}
