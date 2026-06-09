import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { AppFooter } from '@/components/app-footer';
import { AppBreadcrumb } from '@/components/app-breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getCurrentAdmin } from '@/lib/auth';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentAdmin();
  if (!user) redirect('/login');
  // No se puede saltar el cambio de contraseña forzado navegando directo al panel.
  if (user.requirePasswordChange) redirect('/change-password');

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:border focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        Saltar al contenido
      </a>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <AppBreadcrumb />
        </header>
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col gap-4 p-6 outline-none">
          {children}
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
