'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CompassIcon, UploadIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canWithScope, type Action } from '@/lib/permissions';
import type { AdminRole } from '@/lib/auth';

// Nav por ruta del área Carreras (shadcn Tabs, convención). Trigger = Link (asChild).
// El editor solo ve "Subidas" (1 tab) → el nav se oculta; el admin ve ambas.
const TABS: {
  href: string;
  value: string;
  label: string;
  Icon: typeof CompassIcon;
  action: Action;
}[] = [
  { href: '/content/careers', value: 'careers', label: 'Carreras', Icon: CompassIcon, action: 'content:career:write' },
  { href: '/content/careers/uploads', value: 'uploads', label: 'Subidas', Icon: UploadIcon, action: 'content:career:upload' },
];

export function CareersNav({ role, isGlobalScope }: { role: AdminRole; isGlobalScope: boolean }) {
  const pathname = usePathname();
  const visible = TABS.filter((t) => canWithScope(role, isGlobalScope, t.action));
  if (visible.length <= 1) return null;
  // Match más específico primero: /content/careers/uploads antes que /content/careers (su prefijo).
  const active =
    [...visible]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.value ??
    visible[0]?.value;

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
