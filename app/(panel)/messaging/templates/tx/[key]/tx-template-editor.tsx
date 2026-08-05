'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { InboxHeader } from '@/components/admin/inbox-header';
import { EmptyState } from '@/components/admin/empty-state';
import {
  fetchTxTemplatePreview,
  useTxTemplates,
  useUpdateTxTemplate,
  type TxTemplate,
  type TxTemplateInput,
} from '@/hooks/use-tx-templates';

// Suficiente para que una ráfaga de tecleo dispare un solo render, sin que el
// preview se sienta congelado al parar de escribir.
const PREVIEW_DEBOUNCE_MS = 600;

export function TxTemplateEditor({ templateKey }: { templateKey: string }) {
  const { data, isLoading } = useTxTemplates();

  if (isLoading) return <Skeleton className="h-[32rem] w-full" />;

  const tpl = data?.find((t) => t.key === templateKey);
  if (!tpl) {
    return (
      <EmptyState
        message="Ese correo no existe"
        description="La plantilla que buscás no está en el catálogo de transaccionales."
      />
    );
  }

  return <TemplateForm tpl={tpl} />;
}

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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
            Variables permitidas:
            {tpl.allowedVars.map((variable) => (
              <Badge key={variable} variant="secondary">{`{{${variable}}}`}</Badge>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tx-subject">Asunto</Label>
            <Input
              id="tx-subject"
              value={v.subject}
              maxLength={200}
              onChange={(e) => set('subject', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tx-headline">Titular</Label>
            <Input
              id="tx-headline"
              value={v.headline}
              maxLength={120}
              onChange={(e) => set('headline', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tx-body">Cuerpo</Label>
            <Textarea
              id="tx-body"
              value={v.body}
              rows={7}
              maxLength={4000}
              onChange={(e) => set('body', e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-cta">Texto del botón</Label>
              <Input
                id="tx-cta"
                value={v.ctaLabel}
                maxLength={60}
                onChange={(e) => set('ctaLabel', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-secondary">Texto secundario (opcional)</Label>
              <Input
                id="tx-secondary"
                value={v.secondary ?? ''}
                maxLength={600}
                onChange={(e) => set('secondary', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <p className="text-muted-foreground text-xs">
              Si dejás un campo vacío o usás una variable no permitida, no se guarda.
            </p>
          </div>
        </CardContent>
      </Card>

      <TemplatePreview templateKey={tpl.key} draft={v} />
    </div>
  );
}

/**
 * Preview del correo real. El HTML lo arma el backend (mismo pipeline que el
 * envío) → va en un iframe para que sus estilos inline no pisen el panel.
 *
 * `sandbox="allow-same-origin"` sin `allow-scripts`: el HTML no ejecuta nada,
 * pero el documento queda legible desde el panel, que es lo que permite medir su
 * alto real. Las dos flags juntas serían equivalentes a quitar el sandbox.
 */
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
    <div className="space-y-2 lg:sticky lg:top-4">
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
        <Skeleton className="h-[32rem] w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <InboxHeader subject={draft.subject} />
          <AutoHeightFrame html={html} />
        </div>
      )}
    </div>
  );
}

// Alto mínimo mientras el documento aún no reportó el suyo: evita que el marco
// colapse a 0 px entre que carga el HTML y se mide.
const MIN_FRAME_HEIGHT = 320;

/**
 * iframe que crece hasta el alto real de su contenido — el email se lee de
 * corrido, sin una barra de scroll interna que no existe en ninguna bandeja.
 * Se mide al cargar y ante cualquier reflujo (imágenes que terminan de bajar,
 * ancho del panel que cambia).
 */
function AutoHeightFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_FRAME_HEIGHT);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    function measure(): void {
      const doc = frame?.contentDocument;
      if (!doc?.documentElement) return;
      setHeight(Math.max(MIN_FRAME_HEIGHT, doc.documentElement.scrollHeight));
    }

    measure();
    frame.addEventListener('load', measure);

    // El contenido del iframe no dispara resize del panel: hay que observar SU
    // documento. La mascota es una imagen remota que llega después del load.
    const doc = frame.contentDocument;
    const observer = doc?.body ? new ResizeObserver(measure) : null;
    if (doc?.body) observer?.observe(doc.body);

    return () => {
      frame.removeEventListener('load', measure);
      observer?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Vista previa del email"
      srcDoc={html}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{ height }}
      className="w-full bg-white"
    />
  );
}
