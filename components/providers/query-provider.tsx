'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { isUnauthorized } from '@/lib/bff';

const EXPIRED_URL = '/login?reason=expired';

function createQueryClient(): QueryClient {
  // Una sesión caída dispara 401 en todo lo que esté en vuelo: se avisa y se sale UNA vez.
  let isLeaving = false;

  const onError = (error: unknown): void => {
    if (!isUnauthorized(error) || isLeaving) return;
    isLeaving = true;
    client.clear();
    toast.error('Tu sesión expiró. Volvé a ingresar.');
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa a propósito: descarta caché de queries y Router Cache de la sesión vieja
    window.location.assign(EXPIRED_URL);
  };

  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Reintentar un 401 no lo arregla y retrasa el aviso.
        retry: (failureCount, error) =>
          !isUnauthorized(error) && failureCount < 1,
      },
    },
  });

  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
