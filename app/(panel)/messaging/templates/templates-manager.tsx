'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  useMessageTemplates,
  useTemplateMutations,
  type MessageChannel,
  type MessageTemplate,
} from '@/hooks/use-message-templates';

const CHANNEL_LABELS: Record<MessageChannel, string> = { email: 'Email', push: 'Push' };

export function TemplatesManager() {
  const { data, isLoading, isError } = useMessageTemplates();
  const { create, remove } = useTemplateMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MessageTemplate | null>(null);

  const templates = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" /> Nueva plantilla
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-destructive text-sm">No se pudieron cargar las plantillas.</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin plantillas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.key}</TableCell>
                <TableCell>{CHANNEL_LABELS[t.channel]}</TableCell>
                <TableCell className="max-w-xs truncate">{t.subject ?? '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      t.isActive
                        ? 'border-success/40 bg-success/15 text-success'
                        : 'text-muted-foreground'
                    }
                  >
                    {t.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(t)}
                  >
                    <Trash2Icon className="size-4" /> Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={(i) => create.mutateAsync(i)} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Eliminar plantilla"
        description={removeTarget ? `Se elimina «${removeTarget.key}».` : ''}
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (removeTarget) await remove.mutateAsync(removeTarget.id);
          toast.success('Plantilla eliminada');
        }}
      />
    </div>
  );
}

function CreateTemplateDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: { key: string; channel: MessageChannel; subject?: string; body: string; isActive: boolean }) => Promise<unknown>;
}) {
  const [key, setKey] = useState('');
  const [channel, setChannel] = useState<MessageChannel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const valid = /^[a-z0-9-]+$/.test(key) && body.trim().length > 0;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await props.onCreate({
        key,
        channel,
        subject: channel === 'email' && subject ? subject : undefined,
        body,
        isActive: true,
      });
      props.onOpenChange(false);
      setKey(''); setSubject(''); setBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva plantilla</DialogTitle>
          <DialogDescription>Key única (minúsculas/guiones). Variables: {'{{name}}'}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field><FieldLabel htmlFor="t-key">Key</FieldLabel><Input id="t-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="promo-junio" /></Field>
          <Field><FieldLabel>Canal</FieldLabel>
            <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="push">Push</SelectItem></SelectContent>
            </Select>
          </Field>
          {channel === 'email' && (
            <Field>
              <FieldLabel htmlFor="t-subject">Asunto</FieldLabel>
              <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}
          <Field><FieldLabel htmlFor="t-body">Cuerpo</FieldLabel><Textarea id="t-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || submitting} onClick={submit}>{submitting ? 'Creando…' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
