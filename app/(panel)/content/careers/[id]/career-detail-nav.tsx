'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BuildingIcon, CompassIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Nav por ruta de UNA carrera (mismo patrón que CareersNav: shadcn Tabs, trigger = Link).
// Las dos pestañas viven bajo `content:career:write`, así que no hay filtro por permiso.
const TABS = [
  { segment: 'edit', label: 'Datos', Icon: CompassIcon },
  { segment: 'offers', label: 'Universidades privadas', Icon: BuildingIcon },
] as const;

export function CareerDetailNav({ careerId }: { careerId: string }) {
  const pathname = usePathname();
  const active = TABS.find((t) => pathname.endsWith(`/${t.segment}`))?.segment ?? 'edit';

  return (
    <Tabs value={active}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.segment} value={t.segment} asChild>
            <Link href={`/content/careers/${careerId}/${t.segment}`}>
              <t.Icon />
              {t.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
