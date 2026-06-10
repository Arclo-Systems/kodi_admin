'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BookOpenIcon,
  BracesIcon,
  ChevronsUpDownIcon,
  Code2Icon,
  ExternalLinkIcon,
  GlobeIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { AdminUser } from '@/lib/auth';
import { RoleBadge } from '@/lib/roles';

// Enlaces del panel, centralizados acá. El manual se sirve same-origin bajo /docs (detrás de
// la sesión); el resto son placeholders hasta que esos sitios estén desplegados.
const LINKS = {
  panelDocs: '/docs/',
  techDocs: 'https://docs.appkodi.com/tecnica',
  apiDocs: 'https://docs.appkodi.com/api',
  brandBook: 'https://docs.appkodi.com/marca',
  website: 'https://appkodi.com',
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ExternalMenuItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon aria-hidden />
        <span>{children}</span>
        <ExternalLinkIcon aria-hidden className="text-muted-foreground ml-auto size-3" />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    </DropdownMenuItem>
  );
}

export function NavUser({ user }: { user: AdminUser }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Guard de hidratación de next-themes: resolvedTheme solo existe en cliente. Es el patrón
  // documentado; la regla set-state-in-effect es un falso positivo acá.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const isAdmin = user.role === 'admin';
  const scopeLabel = user.isGlobalScope ? 'Global' : user.assignedCountries.join(', ') || '—';

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-medium">
                  {initials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-medium">
                    {initials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">{user.displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <RoleBadge role={user.role} />
                <Badge variant="outline">{scopeLabel}</Badge>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/me/sessions')}>
              <MonitorSmartphoneIcon aria-hidden />
              Mis sesiones
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/change-password')}>
              <KeyRoundIcon aria-hidden />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              {isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {isDark ? 'Modo claro' : 'Modo oscuro'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Documentación
            </DropdownMenuLabel>
            <ExternalMenuItem href={LINKS.panelDocs} icon={BookOpenIcon}>
              Documentación del panel
            </ExternalMenuItem>
            {isAdmin && (
              <ExternalMenuItem href={LINKS.techDocs} icon={Code2Icon}>
                Documentación técnica
              </ExternalMenuItem>
            )}
            {isAdmin && (
              <ExternalMenuItem href={LINKS.apiDocs} icon={BracesIcon}>
                Documentación API
              </ExternalMenuItem>
            )}
            {isAdmin && (
              <ExternalMenuItem href={LINKS.brandBook} icon={PaletteIcon}>
                Libro de marca
              </ExternalMenuItem>
            )}
            <ExternalMenuItem href={LINKS.website} icon={GlobeIcon}>
              Sitio web
            </ExternalMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOutIcon aria-hidden />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
