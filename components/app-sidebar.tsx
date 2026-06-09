'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BookOpenIcon,
  BotIcon,
  CoinsIcon,
  FlagIcon,
  InboxIcon,
  Gamepad2Icon,
  HeartPulseIcon,
  LayersIcon,
  LightbulbIcon,
  LayoutDashboardIcon,
  RocketIcon,
  ScrollTextIcon,
  SendIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { canWithScope, type Action } from '@/lib/permissions';
import type { AdminUser } from '@/lib/auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: Action;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: 'General',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboardIcon, action: 'view:dashboard' }],
  },
  {
    label: 'Usuarios',
    items: [
      { href: '/users', label: 'Usuarios', icon: UsersIcon, action: 'view:users' },
      { href: '/moderation', label: 'Moderación', icon: FlagIcon, action: 'view:moderation' },
      { href: '/tickets', label: 'Tickets', icon: InboxIcon, action: 'view:tickets' },
    ],
  },
  {
    label: 'Aprendizaje',
    items: [
      { href: '/content', label: 'Contenido', icon: BookOpenIcon, action: 'view:content' },
      { href: '/game', label: 'Juego', icon: Gamepad2Icon, action: 'view:game' },
      { href: '/bots', label: 'Bots', icon: BotIcon, action: 'view:bots' },
      { href: '/leagues', label: 'Ligas', icon: TrophyIcon, action: 'view:leagues' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { href: '/economy', label: 'Economía', icon: CoinsIcon, action: 'view:economy' },
      { href: '/finance', label: 'Finanzas', icon: WalletIcon, action: 'view:finance' },
      { href: '/messaging', label: 'Mensajería', icon: SendIcon, action: 'view:messaging' },
      { href: '/launches', label: 'Lanzamientos', icon: RocketIcon, action: 'view:launches' },
      { href: '/features', label: 'Features', icon: LightbulbIcon, action: 'view:features' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admins', label: 'Admins', icon: ShieldCheckIcon, action: 'view:admins' },
      { href: '/audit-log', label: 'Audit log', icon: ScrollTextIcon, action: 'view:audit-log' },
      { href: '/health', label: 'Health', icon: HeartPulseIcon, action: 'view:health' },
      { href: '/jobs', label: 'Jobs', icon: LayersIcon, action: 'view:jobs' },
    ],
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & { user: AdminUser };

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const groups = NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => canWithScope(user.role, user.isGlobalScope, item.action)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image src="/icon.svg" alt="" width={32} height={32} className="size-8" unoptimized />
                <span className="font-semibold">Kodi Inc.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
