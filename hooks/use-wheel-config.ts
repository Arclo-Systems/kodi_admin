'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// La corona se sube a su propio endpoint (no al del árbol de contenido): no cuelga de ningún
// módulo, es config de juego. El backend solo acepta png/jpeg/webp/avif — SVG no, por la regla
// anti-XSS del bucket público.
export const WHEEL_CROWN_ASSET_ENDPOINT = '/api/admin/game/wheel-config/upload-asset';

/** Lo editable de la corona. El PUT reemplaza la config completa: se mandan siempre los dos. */
export type WheelConfigInput = {
  crownAssetUrl: string | null;
  crownColorHex: string | null;
};

export type WheelConfig = WheelConfigInput & {
  updatedBy: string | null;
  updatedAt: string | null;
};

const QUERY_KEY = ['wheel-config'];

// Config global que cambia con muy baja frecuencia y la lee cada pestaña Ruleta que se abra.
const STALE_MS = 10 * 60 * 1000;

/**
 * Corona global de la ruleta. `enabled` en false para roles sin permiso: el GET es admin-only y
 * pedirlo igual sería un 403 garantizado — sin config, la réplica cae al arte local de la app.
 */
export function useWheelConfig(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    enabled,
    staleTime: STALE_MS,
    queryFn: async (): Promise<WheelConfig | null> => {
      const res = await fetch('/api/admin/game/wheel-config', { credentials: 'include' });
      if (!res.ok) throw new Error('fetch wheel-config failed');
      return unwrapData<WheelConfig>(await res.json()) ?? null;
    },
  });
}

export function useUpdateWheelConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WheelConfigInput) => {
      const res = await fetch('/api/admin/game/wheel-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: { message?: string };
        };
        throw new Error(b.error?.message ?? b.message ?? 'Error guardando la corona');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
