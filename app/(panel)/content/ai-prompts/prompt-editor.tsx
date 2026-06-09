'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FilePlus2Icon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAiPromptMutations, type AiPromptDetail } from '@/hooks/use-ai-prompts';

export function PromptEditor({ prompt }: { prompt: AiPromptDetail }) {
  const m = useAiPromptMutations();
  const active = prompt.versions.find((v) => v.id === prompt.activeVersionId) ?? prompt.versions[0];
  const [systemText, setSystemText] = useState(active?.systemText ?? '');
  const [variables, setVariables] = useState((active?.variables ?? []).join(', '));
  const [note, setNote] = useState('');

  function save(): void {
    const vars = variables
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    m.createVersion.mutate(
      { id: prompt.id, systemText, variables: vars, note: note || undefined },
      {
        onSuccess: () => {
          toast.success('Nueva versión creada (no activa)');
          setNote('');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FilePlus2Icon className="text-primary size-4" />
          Nueva versión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field>
          <FieldLabel htmlFor="pe-system">System prompt</FieldLabel>
          <Textarea
            id="pe-system"
            value={systemText}
            onChange={(e) => setSystemText(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pe-vars">Variables (separadas por coma)</FieldLabel>
          <Input
            id="pe-vars"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            placeholder="topicName, accuracy"
          />
          <FieldDescription>Referencialas como {'{{variable}}'} en el texto.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="pe-note">Nota (opcional)</FieldLabel>
          <Input id="pe-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={save} disabled={m.createVersion.isPending || !systemText.trim()}>
            <PlusIcon className="size-4" />
            {m.createVersion.isPending ? 'Creando…' : 'Crear versión'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
