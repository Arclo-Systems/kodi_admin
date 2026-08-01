'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

export type NotificationCatalogEntry = {
  type: string;
  label: string;
  trigger: string;
  /** `null` = no se puede apagar desde la app. */
  settingKey: string | null;
};

export function useNotificationsCatalog() {
  return useQuery({
    queryKey: ['notifications', 'catalog'],
    queryFn: async (): Promise<NotificationCatalogEntry[]> => {
      const res = await fetch('/api/admin/notifications/catalog', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('No se pudo cargar el catálogo');
      return unwrapData<NotificationCatalogEntry[]>(await res.json()) ?? [];
    },
    // Es configuración que solo cambia con un deploy.
    staleTime: 24 * 60 * 60 * 1000,
  });
}
