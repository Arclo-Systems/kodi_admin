'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

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
      return (
        (await fetchJson<NotificationCatalogEntry[]>(
          '/api/admin/notifications/catalog',
        )) ?? []
      );
    },
    // Es configuración que solo cambia con un deploy.
    staleTime: 24 * 60 * 60 * 1000,
  });
}
