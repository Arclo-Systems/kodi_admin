'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchTxTemplatePreview,
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

// Suficiente para que una ráfaga de tecleo dispare un solo render, sin que el
// preview se sienta congelado al parar de escribir.
const PREVIEW_DEBOUNCE_MS = 600;

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
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
      <TemplatePreview templateKey={tpl.key} draft={v} />
    </div>
  );
}

// El HTML es el que arma el backend (mismo pipeline que el envío), así que va en
// un iframe: aislarlo evita que sus estilos inline pisen el panel. `sandbox=""`
// = sin scripts, sin forms, origen opaco.
function TemplatePreview({ templateKey, draft }: { templateKey: string; draft: TxTemplateInput }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsLoading(true);
      fetchTxTemplatePreview(templateKey, draft, controller.signal)
        .then((next) => {
          setHtml(next);
          setError(null);
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [templateKey, draft]);

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-xs">
        Vista previa con datos de ejemplo. El enlace del botón es de prueba.
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo generar la vista previa</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {isLoading && !html ? (
        <Skeleton className="h-[28rem] w-full" />
      ) : (
        <iframe
          title="Vista previa del email"
          srcDoc={html}
          sandbox=""
          className="h-[28rem] w-full rounded-lg border bg-white"
        />
      )}
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
