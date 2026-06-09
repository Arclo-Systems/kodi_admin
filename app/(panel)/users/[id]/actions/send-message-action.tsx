'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import type { MessageChannel } from '@/hooks/use-message-templates';
import { MessagePreview } from '@/components/admin/message-preview';

// Mensaje 1-a-1 a un usuario (campaña kind=direct). El envío real lo procesa el cron campaign-send;
// acá creamos la campaña y la marcamos para enviar.
export function SendMessageAction({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [channel, setChannel] = useState<MessageChannel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = body.trim().length > 0 && (channel === 'push' || subject.trim().length > 0);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/messaging/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'direct', channel, subject: subject || undefined, body, targetUserId: userId }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(d.message ?? 'Error');
      }
      const created = (await res.json().catch(() => ({}))) as { data?: { id?: string } };
      const id = created?.data?.id;
      // Campaña direct nace en draft → la marcamos para enviar (el cron la procesa).
      if (id) await fetch(`/api/admin/messaging/campaigns/${id}/send`, { method: 'POST' });
      toast.success('Mensaje encolado');
      onOpenChange(false);
      setSubject(''); setBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar mensaje</DialogTitle>
          <DialogDescription>Mensaje directo a este usuario (email o push).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field>
            <FieldLabel>Canal</FieldLabel>
            <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="push">Push</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="m-subject">{channel === 'email' ? 'Asunto' : 'Título'}</FieldLabel>
            <Input id="m-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field><FieldLabel htmlFor="m-body">Mensaje</FieldLabel><Textarea id="m-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>

          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Vista previa</span>
            <MessagePreview channel={channel} subject={subject} body={body} />
          </div>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || submitting} onClick={submit}>{submitting ? 'Enviando…' : 'Enviar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
