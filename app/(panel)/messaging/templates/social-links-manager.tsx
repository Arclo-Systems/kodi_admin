'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmailSocialLinks,
  useUpdateEmailSocialLinks,
  type EmailSocialLinks,
  type EmailSocialLinksInput,
} from '@/hooks/use-email-social-links';

const FIELDS: ReadonlyArray<{
  key: keyof EmailSocialLinksInput;
  label: string;
  placeholder: string;
}> = [
  { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/kodi.app' },
  { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/kodi.app' },
  { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@kodi.app' },
  { key: 'whatsappUrl', label: 'WhatsApp', placeholder: 'https://wa.me/506...' },
  { key: 'websiteUrl', label: 'Sitio web', placeholder: 'https://kodi.app' },
];

function SocialLinksForm({ links }: { links: EmailSocialLinks }) {
  const update = useUpdateEmailSocialLinks();
  const [v, setV] = useState<EmailSocialLinksInput>({
    instagramUrl: links.instagramUrl,
    facebookUrl: links.facebookUrl,
    tiktokUrl: links.tiktokUrl,
    whatsappUrl: links.whatsappUrl,
    websiteUrl: links.websiteUrl,
  });

  function set(key: keyof EmailSocialLinksInput, value: string): void {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function save(): void {
    update.mutate(v, {
      onSuccess: () => toast.success('Redes guardadas'),
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-3">
      {/* 5 redes: a 3 columnas los inputs de URL quedan apretados salvo en pantallas anchas. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              type="url"
              inputMode="url"
              value={v[field.key] ?? ''}
              maxLength={300}
              placeholder={field.placeholder}
              onChange={(e) => set(field.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Vacío = el ícono no aparece en los correos. Solo se aceptan enlaces https.
      </p>
      <Button onClick={save} disabled={update.isPending}>
        {update.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}

export function SocialLinksManager() {
  const { data, isLoading } = useEmailSocialLinks();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Redes sociales del pie</h2>
        <p className="text-muted-foreground text-sm">
          Enlaces de los íconos que van al pie de todos los correos, transaccionales y campañas.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enlaces</CardTitle>
        </CardHeader>
        <CardContent>
          {/* key: el form arranca del valor cargado; si la query se refresca, se remonta con el nuevo. */}
          <SocialLinksForm
            key={FIELDS.map((field) => data[field.key]).join('|')}
            links={data}
          />
        </CardContent>
      </Card>
    </div>
  );
}
