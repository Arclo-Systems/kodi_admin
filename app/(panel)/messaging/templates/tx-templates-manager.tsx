'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTxTemplates,
  useUpdateTxTemplate,
  type TxTemplate,
  type TxTemplateInput,
} from '@/hooks/use-tx-templates';

const KEY_LABELS: Record<string, string> = {
  welcome: 'Bienvenida + verificación',
  password_reset: 'Recuperar contraseña',
  parental_consent: 'Consentimiento parental',
};

function TemplateForm({ tpl }: { tpl: TxTemplate }) {
  const update = useUpdateTxTemplate();
  const [v, setV] = useState<TxTemplateInput>({
    subject: tpl.subject,
    headline: tpl.headline,
    body: tpl.body,
    ctaLabel: tpl.ctaLabel,
    secondary: tpl.secondary,
  });

  function set<K extends keyof TxTemplateInput>(k: K, val: TxTemplateInput[K]): void {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function save(): void {
    update.mutate(
      { key: tpl.key, input: { ...v, secondary: v.secondary?.trim() ? v.secondary : null } },
      {
        onSuccess: () => toast.success('Plantilla guardada'),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        Variables permitidas:
        {tpl.allowedVars.map((variable) => (
          <Badge key={variable} variant="secondary">{`{{${variable}}}`}</Badge>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Asunto</Label>
        <Input value={v.subject} maxLength={200} onChange={(e) => set('subject', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titular</Label>
        <Input value={v.headline} maxLength={120} onChange={(e) => set('headline', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Cuerpo</Label>
        <Textarea
          value={v.body}
          rows={5}
          maxLength={4000}
          onChange={(e) => set('body', e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Texto del botón</Label>
          <Input value={v.ctaLabel} maxLength={60} onChange={(e) => set('ctaLabel', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Texto secundario (opcional)</Label>
          <Input
            value={v.secondary ?? ''}
            maxLength={600}
            onChange={(e) => set('secondary', e.target.value)}
          />
        </div>
      </div>
      <Button onClick={save} disabled={update.isPending}>
        {update.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}

export function TxTemplatesManager() {
  const { data, isLoading } = useTxTemplates();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Emails transaccionales</h2>
        <p className="text-muted-foreground text-sm">
          Editá el texto de los emails críticos. El botón, la estructura y el enlace de seguridad
          quedan fijos. Si dejás un campo vacío o usás una variable no permitida, no se guarda.
        </p>
      </div>
      {data.map((tpl) => (
        <Card key={tpl.key}>
          <CardHeader>
            <CardTitle className="text-base">{KEY_LABELS[tpl.key] ?? tpl.key}</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateForm tpl={tpl} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
