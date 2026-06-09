'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FlaskConicalIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePlayground, type PlaygroundResult } from '@/hooks/use-ai-prompts';

export function PromptPlaygroundPanel({
  initialSystemText,
  variables,
}: {
  initialSystemText: string;
  variables: string[];
}) {
  const play = usePlayground();
  const [systemText, setSystemText] = useState(initialSystemText);
  const [userMessage, setUserMessage] = useState('');
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlaygroundResult | null>(null);

  function run(): void {
    play.mutate(
      { systemText, userMessage, variables: varValues },
      {
        onSuccess: (r) => setResult(r ?? null),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConicalIcon className="text-primary size-4" />
          Playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field>
          <FieldLabel htmlFor="pp-system">System</FieldLabel>
          <Textarea
            id="pp-system"
            value={systemText}
            onChange={(e) => setSystemText(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
        </Field>
        {variables.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {variables.map((v) => (
              <Field key={v}>
                <FieldLabel htmlFor={`pp-var-${v}`}>{v}</FieldLabel>
                <Input
                  id={`pp-var-${v}`}
                  value={varValues[v] ?? ''}
                  onChange={(e) => setVarValues({ ...varValues, [v]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="pp-user">Mensaje del usuario</FieldLabel>
          <Textarea
            id="pp-user"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            rows={2}
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={run} disabled={play.isPending || !userMessage.trim()}>
            <PlayIcon className="size-4" />
            {play.isPending ? 'Ejecutando…' : 'Ejecutar'}
          </Button>
        </div>
        {result && (
          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            <p className="whitespace-pre-wrap">{result.output}</p>
            {result.usage && (
              <p className="text-muted-foreground mt-2 text-xs">
                {result.usage.inputTokens} tokens in · {result.usage.outputTokens} tokens out
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
