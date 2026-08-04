'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapData } from '@/lib/bff';

// El orden de las claves espeja el del pie del email.
export type EmailSocialLinksInput = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  websiteUrl: string | null;
};

export type EmailSocialLinks = EmailSocialLinksInput & {
  // El backend resuelve R2 vs /static; el panel solo pinta la URL que le den.
  assets: { koko: string };
};

// Config global de envío: cambia con muy baja frecuencia y la consume también el
// preview del composer → staleTime largo para no refetchear en cada montaje.
const STALE_MS = 10 * 60 * 1000;

export function useEmailSocialLinks() {
  return useQuery({
    queryKey: ['email-social-links'],
    staleTime: STALE_MS,
    queryFn: async (): Promise<EmailSocialLinks | undefined> => {
      const res = await fetch('/api/admin/messaging/social-links', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fetch social-links failed');
      return unwrapData<EmailSocialLinks>(await res.json());
    },
  });
}

export function useUpdateEmailSocialLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmailSocialLinksInput) => {
      const res = await fetch('/api/admin/messaging/social-links', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(b.message ?? 'Error');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-social-links'] }),
  });
}
