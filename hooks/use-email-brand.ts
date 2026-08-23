'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';

export const BRAND_SIZES = ['sm', 'md', 'lg'] as const;
export type BrandSize = (typeof BRAND_SIZES)[number];

// Espeja el PUT del backend: null/'' = restaurar el valor por defecto.
// El orden de las redes espeja el del pie del email.
export type EmailBrandInput = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  websiteUrl: string | null;
  mascotUrl: string | null;
  wordmarkUrl: string | null;
  ctaColor: string | null;
  headlineColor: string | null;
  mascotSize: BrandSize | null;
  headlineSize: BrandSize | null;
};

// `defaults` dice qué usa el email cuando un campo está en null. Viene del
// backend a propósito: duplicar los hex acá los dejaría desincronizados en
// silencio la primera vez que cambie el diseño del correo.
export type EmailBrand = EmailBrandInput & {
  defaults: {
    mascotUrl: string;
    ctaColor: string;
    headlineColor: string;
    mascotSize: BrandSize;
    headlineSize: BrandSize;
  };
};

// Config global de envío: cambia con muy baja frecuencia y la consume también el
// preview del composer → staleTime largo para no refetchear en cada montaje.
const STALE_MS = 10 * 60 * 1000;

export function useEmailBrand() {
  return useQuery({
    queryKey: ['email-brand'],
    staleTime: STALE_MS,
    queryFn: async (): Promise<EmailBrand | undefined> => {
      return fetchJson<EmailBrand>('/api/admin/messaging/brand');
    },
  });
}

export function useUpdateEmailBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmailBrandInput) => {
      const res = await fetch('/api/admin/messaging/brand', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        // El 422 de contraste trae el motivo exacto (ratio y mínimo) en `message`:
        // mostrarlo literal es más útil que un "Error" genérico.
        const b = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: { message?: string };
        };
        throw new Error(b.error?.message ?? b.message ?? 'Error');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-brand'] }),
  });
}

/**
 * Sube la mascota o el logo a R2 y devuelve su URL. No es useMutation porque el
 * componente de upload maneja su propio estado de archivo (espejo del hero de
 * campañas), y quien decide si esa URL se guarda es el form, no la subida.
 */
export async function uploadEmailBrandAsset(file: {
  filename: string;
  contentType: string;
  dataBase64: string;
}): Promise<string> {
  const res = await fetch('/api/admin/messaging/brand/upload-asset', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(file),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { url?: string };
    message?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(body.error?.message ?? body.message ?? 'Error subiendo la imagen');
  }
  return body.data?.url ?? '';
}
