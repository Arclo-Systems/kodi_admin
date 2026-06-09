'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { slug: '', label: 'Perfil' },
  { slug: 'activity', label: 'Actividad' },
  { slug: 'economy', label: 'Economía' },
  { slug: 'inventory', label: 'Inventario' },
  { slug: 'achievements', label: 'Logros' },
  { slug: 'leagues', label: 'Ligas' },
  { slug: 'subscriptions', label: 'Suscripciones' },
  { slug: 'coupons', label: 'Cupones' },
  { slug: 'social', label: 'Social' },
  { slug: 'ai', label: 'IA' },
  { slug: 'events', label: 'Eventos' },
];

export function TabsNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones del usuario"
      className="flex gap-1 overflow-x-auto overflow-y-hidden border-b"
    >
      {TABS.map((t) => {
        const href = t.slug ? `/users/${userId}/${t.slug}` : `/users/${userId}`;
        const active = pathname === href;
        return (
          <Link
            key={t.slug || 'profile'}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
