'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileTextIcon, MegaphoneIcon, UsersIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canWithScope, type Action } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';

// Nav por ruta con la MISMA presentación que el resto del panel: shadcn Tabs (convención).
// Cada trigger es un Link (asChild) → navega; el activo sale del pathname.
const TABS: {
  href: string;
  value: string;
  label: string;
  Icon: typeof MegaphoneIcon;
  action: Action;
}[] = [
  { href: '/messaging', value: 'campaigns', label: 'Campañas', Icon: MegaphoneIcon, action: 'view:messaging' },
  { href: '/messaging/segments', value: 'segments', label: 'Segmentos', Icon: UsersIcon, action: 'messaging:segments' },
  { href: '/messaging/templates', value: 'templates', label: 'Plantillas', Icon: FileTextIcon, action: 'messaging:templates' },
];

export function MessagingNav({
  role,
  isGlobalScope,
}: {
  role: AdminRole;
  isGlobalScope: boolean;
}) {
  const pathname = usePathname();
  const visible = TABS.filter((t) => canWithScope(role, isGlobalScope, t.action));
  if (visible.length <= 1) return null;
  const active = visible.find((t) => t.href === pathname)?.value ?? visible[0]?.value;

  return (
    <Tabs value={active}>
      <TabsList>
        {visible.map((t) => {
          const Icon = t.Icon;
          return (
            <TabsTrigger key={t.value} value={t.value} asChild>
              <Link href={t.href}>
                <Icon />
                {t.label}
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
