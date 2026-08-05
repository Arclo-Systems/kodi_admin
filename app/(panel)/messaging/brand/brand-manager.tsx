'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ctaContrastRatio, hasReadableCtaContrast, isHexColor } from '@/lib/email-contrast';
import {
  useEmailBrand,
  useUpdateEmailBrand,
  type BrandSize,
  type EmailBrand,
  type EmailBrandInput,
} from '@/hooks/use-email-brand';
import { BrandColorField } from './brand-color-field';
import { BrandImageField } from './brand-image-field';

const SOCIAL_FIELDS: ReadonlyArray<{
  key: keyof EmailBrandInput;
  label: string;
  placeholder: string;
}> = [
  { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/kodi.app' },
  { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/kodi.app' },
  { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@kodi.app' },
  { key: 'whatsappUrl', label: 'WhatsApp', placeholder: 'https://wa.me/506...' },
  { key: 'websiteUrl', label: 'Sitio web', placeholder: 'https://kodi.app' },
];

// Los px son los del backend; se nombran para que el admin elija por intención y
// no por número (el número igual va entre paréntesis: es un panel, no una app).
const SIZE_LABELS: Record<BrandSize, { mascot: string; headline: string }> = {
  sm: { mascot: 'Pequeña (120 px)', headline: 'Pequeño (22 px)' },
  md: { mascot: 'Mediana (180 px)', headline: 'Mediano (24 px)' },
  lg: { mascot: 'Grande (240 px)', headline: 'Grande (30 px)' },
};

const SIZES: BrandSize[] = ['sm', 'md', 'lg'];

function toInput(brand: EmailBrand): EmailBrandInput {
  return {
    instagramUrl: brand.instagramUrl,
    facebookUrl: brand.facebookUrl,
    tiktokUrl: brand.tiktokUrl,
    whatsappUrl: brand.whatsappUrl,
    websiteUrl: brand.websiteUrl,
    mascotUrl: brand.mascotUrl,
    wordmarkUrl: brand.wordmarkUrl,
    ctaColor: brand.ctaColor,
    headlineColor: brand.headlineColor,
    mascotSize: brand.mascotSize,
    headlineSize: brand.headlineSize,
  };
}

function BrandForm({ brand }: { brand: EmailBrand }) {
  const update = useUpdateEmailBrand();
  const [v, setV] = useState<EmailBrandInput>(toInput(brand));

  function set<K extends keyof EmailBrandInput>(key: K, value: EmailBrandInput[K]): void {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  // Espejo del 422 del backend: el texto del botón es blanco y no se configura,
  // así que un color sin contraste dejaría el CTA ilegible en todos los correos.
  const ctaBlocked = Boolean(v.ctaColor && isHexColor(v.ctaColor) && !hasReadableCtaContrast(v.ctaColor));
  const ctaWarning = ctaBlocked
    ? `El texto blanco no se lee sobre este color (contraste ${ctaContrastRatio(v.ctaColor ?? '').toFixed(1)}:1, mínimo 3:1).`
    : undefined;

  function save(): void {
    update.mutate(v, {
      onSuccess: () => toast.success('Identidad guardada'),
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encabezado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <BrandImageField
            label="Mascota"
            hint="PNG o WebP, entre 64 y 2000 px por lado, máx 1 MB. Vacío = Koko."
            value={v.mascotUrl}
            fallbackUrl={brand.defaults.mascotUrl}
            fallbackLabel="Koko (por defecto)"
            onChange={(url) => set('mascotUrl', url)}
          />
          <BrandImageField
            label="Logo"
            hint="Se sirve a 28 px de alto. Vacío = el wordmark de texto “kodi.”."
            value={v.wordmarkUrl}
            fallbackLabel="kodi. (texto)"
            onChange={(url) => set('wordmarkUrl', url)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colores y tamaños</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <BrandColorField
            label="Color del botón"
            hint="El texto del botón siempre es blanco: el color tiene que contrastar al menos 3:1."
            value={v.ctaColor}
            fallback={brand.defaults.ctaColor}
            warning={ctaWarning}
            onChange={(hex) => set('ctaColor', hex)}
          />
          <BrandColorField
            label="Color del titular"
            hint="Se aplica al título grande del correo."
            value={v.headlineColor}
            fallback={brand.defaults.headlineColor}
            onChange={(hex) => set('headlineColor', hex)}
          />
          <SizeField
            label="Tamaño de la mascota"
            value={v.mascotSize}
            fallback={brand.defaults.mascotSize}
            optionLabel={(size) => SIZE_LABELS[size].mascot}
            onChange={(size) => set('mascotSize', size)}
          />
          <SizeField
            label="Tamaño del titular"
            value={v.headlineSize}
            fallback={brand.defaults.headlineSize}
            optionLabel={(size) => SIZE_LABELS[size].headline}
            onChange={(size) => set('headlineSize', size)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redes del pie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 5 redes: a 3 columnas los inputs de URL quedan apretados salvo en pantallas anchas. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIAL_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type="url"
                  inputMode="url"
                  value={(v[field.key] as string | null) ?? ''}
                  maxLength={300}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.key, e.target.value || null)}
                />
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Vacío = el ícono no aparece en los correos. Solo se aceptan enlaces https.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={update.isPending || ctaBlocked}>
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <p className="text-muted-foreground text-xs">
          Aplica a todos los correos: transaccionales y campañas.
        </p>
      </div>
    </div>
  );
}

// null = "por defecto": es una opción más del Select, no un estado escondido.
const DEFAULT_OPTION = '__default__';

function SizeField({
  label,
  value,
  fallback,
  optionLabel,
  onChange,
}: {
  label: string;
  value: BrandSize | null;
  fallback: BrandSize;
  optionLabel: (size: BrandSize) => string;
  onChange: (size: BrandSize | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value ?? DEFAULT_OPTION}
        onValueChange={(next) => onChange(next === DEFAULT_OPTION ? null : (next as BrandSize))}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_OPTION}>Por defecto — {optionLabel(fallback)}</SelectItem>
          {SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {optionLabel(size)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BrandManager() {
  const { data, isLoading } = useEmailBrand();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  // key: el form arranca del valor cargado; si la query se refresca, se remonta.
  return <BrandForm key={JSON.stringify(toInput(data))} brand={data} />;
}
