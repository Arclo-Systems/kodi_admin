'use client';

import { RichContent } from '@/components/rich-content/rich-content';

type Option = { id: string; text: string };

export function QuestionPreview({
  text,
  options,
  correctOptionId,
  showAnswer,
  explanation,
}: {
  text: string;
  options: Option[];
  correctOptionId: string;
  showAnswer: boolean;
  explanation?: string;
}) {
  return (
    <div className="bg-card space-y-3 rounded-lg border p-4">
      {text ? (
        <RichContent value={text} className="font-medium" />
      ) : (
        <p className="text-muted-foreground text-sm">Texto de la pregunta…</p>
      )}
      <ul className="space-y-2">
        {options.map((o, i) => {
          const correct = showAnswer && !!o.id && o.id === correctOptionId;
          return (
            <li
              key={o.id || i}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
                correct ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className="text-muted-foreground mt-0.5 font-mono text-xs uppercase">
                {o.id || '·'}
              </span>
              {o.text ? (
                <RichContent value={o.text} className="min-w-0 flex-1 [&_p]:my-0" />
              ) : (
                <span className="text-muted-foreground text-sm">Opción…</span>
              )}
              {correct && <span className="text-primary ml-auto text-xs font-medium">correcta</span>}
            </li>
          );
        })}
      </ul>
      {showAnswer && explanation && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Explicación
          </p>
          <RichContent value={explanation} />
        </div>
      )}
    </div>
  );
}
