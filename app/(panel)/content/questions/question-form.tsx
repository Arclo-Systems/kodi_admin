'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CircleHelpIcon, EyeIcon, LayersIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { MarkdownField } from '@/components/rich-content/markdown-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulesTree } from '@/hooks/use-modules-tree';
import { hasHeavySvg } from '@/lib/svg-optimize';
import type { Difficulty, QuestionDetail } from '@/hooks/use-questions';
import { QuestionPreview } from './question-preview';

const NEXT_ID = ['a', 'b', 'c', 'd', 'e', 'f'];
const UPLOAD_URL = '/api/admin/content/questions/upload-image';

const OptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1, 'Requerido').max(2000, 'Máximo 2000 caracteres'),
});
const FormSchema = z
  .object({
    moduleId: z.string().optional(),
    subjectId: z.string().optional(),
    topicId: z.string().optional(),
    text: z.string().trim().min(1, 'Requerido').max(40000, 'Máximo 40000 caracteres'),
    options: z.array(OptionSchema).min(2).max(6),
    correctOptionId: z.string().min(1, 'Elegí la opción correcta'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    explanation: z.string().trim().max(40000, 'Máximo 40000 caracteres').optional(),
  })
  .refine((q) => q.options.some((o) => o.id === q.correctOptionId), {
    message: 'La correcta debe ser una de las opciones',
    path: ['correctOptionId'],
  });
type FormValues = z.infer<typeof FormSchema>;

const DIFFS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

export function QuestionForm({
  mode,
  questionId,
  initial,
}: {
  mode: 'create' | 'edit';
  questionId?: string;
  initial?: QuestionDetail;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: tree } = useModulesTree();
  const [showAnswer, setShowAnswer] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initial
      ? {
          moduleId: initial.moduleId,
          subjectId: initial.subjectId,
          topicId: initial.topicId,
          text: initial.text,
          options: initial.options,
          correctOptionId: initial.correctOptionId,
          difficulty: initial.difficulty,
          explanation: initial.explanation ?? '',
        }
      : {
          moduleId: '',
          subjectId: '',
          topicId: '',
          text: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' },
          ],
          correctOptionId: '',
          difficulty: 'medium',
          explanation: '',
        },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' });
  const values = form.watch();
  const heavySvg = hasHeavySvg(values.text, values.explanation ?? '');

  const modules = tree ?? [];
  const subjects = modules.find((m) => m.id === values.moduleId)?.subjects ?? [];
  const topics = subjects.find((s) => s.id === values.subjectId)?.topics ?? [];

  async function submit(v: FormValues): Promise<void> {
    if (hasHeavySvg(v.text, v.explanation ?? '')) {
      toast.error('Optimizá la figura SVG: supera 30 KB');
      return;
    }
    if (mode === 'create' && (!v.moduleId || !v.subjectId || !v.topicId)) {
      toast.error('Elegí módulo, materia y tema');
      return;
    }
    const payload =
      mode === 'create'
        ? {
            moduleId: v.moduleId,
            subjectId: v.subjectId,
            topicId: v.topicId,
            text: v.text,
            options: v.options,
            correctOptionId: v.correctOptionId,
            difficulty: v.difficulty,
            explanation: v.explanation || undefined,
          }
        : {
            text: v.text,
            options: v.options,
            correctOptionId: v.correctOptionId,
            difficulty: v.difficulty,
            explanation: v.explanation || null,
          };
    const url =
      mode === 'create'
        ? '/api/admin/content/questions'
        : `/api/admin/content/questions/${questionId}`;
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(b.message ?? 'Error guardando la pregunta');
      return;
    }
    toast.success(mode === 'create' ? 'Pregunta creada como borrador' : 'Pregunta actualizada');
    qc.invalidateQueries({ queryKey: ['questions'] });
    if (questionId) qc.invalidateQueries({ queryKey: ['question', questionId] });
    router.push('/content/questions');
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        {mode === 'create' && (
          <fieldset className="min-w-0 space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium">
              <LayersIcon className="text-primary size-4" />
              Clasificación
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Módulo</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('subjectId', '');
                        form.setValue('topicId', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.country} · {m.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="subjectId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Materia</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('topicId', '');
                      }}
                      disabled={!values.moduleId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Materia" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                name="topicId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Tema</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={!values.subjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tema" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
          </fieldset>
        )}

        <fieldset className="min-w-0 space-y-4">
          <legend className="flex items-center gap-2 text-sm font-medium">
            <CircleHelpIcon className="text-primary size-4" />
            Pregunta
          </legend>
          <Controller
            name="text"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="q-text">Enunciado</FieldLabel>
                <MarkdownField
                  id="q-text"
                  value={field.value}
                  onChange={field.onChange}
                  tools={['formula', 'table', 'image', 'mermaid', 'svg']}
                  rows={4}
                  maxLength={40000}
                  ariaInvalid={fieldState.invalid}
                  uploadUrl={UPLOAD_URL}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field>
            <FieldLabel>Opciones</FieldLabel>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 w-5 shrink-0 font-mono text-xs uppercase">
                    {form.getValues(`options.${i}.id`)}
                  </span>
                  <Controller
                    name={`options.${i}.text`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div className="min-w-0 flex-1">
                        <MarkdownField
                          value={field.value}
                          onChange={field.onChange}
                          tools={['formula', 'image', 'mermaid']}
                          rows={2}
                          maxLength={2000}
                          placeholder={`Opción ${i + 1}`}
                          ariaLabel={`Opción ${i + 1}`}
                          ariaInvalid={fieldState.invalid}
                          uploadUrl={UPLOAD_URL}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </div>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mt-0.5 shrink-0"
                      aria-label="Quitar opción"
                      onClick={() => remove(i)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {fields.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => append({ id: NEXT_ID[fields.length] ?? `o${fields.length}`, text: '' })}
              >
                <PlusIcon className="size-4" />
                Agregar opción
              </Button>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="correctOptionId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Respuesta correcta</FieldLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {values.options.map((o, i) => (
                        <SelectItem key={o.id || i} value={o.id}>
                          {o.id.toUpperCase()} —{' '}
                          {o.text ? o.text.replace(/\s+/g, ' ').slice(0, 60) : 'sin texto'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="difficulty"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Dificultad</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Controller
            name="explanation"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="q-exp">Explicación (opcional)</FieldLabel>
                <MarkdownField
                  id="q-exp"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  tools={['formula', 'table', 'image', 'mermaid', 'svg']}
                  rows={3}
                  maxLength={40000}
                  ariaInvalid={fieldState.invalid}
                  uploadUrl={UPLOAD_URL}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </fieldset>

        {heavySvg && (
          <p data-testid="form-heavy-svg" className="text-destructive text-right text-sm">
            Hay una figura SVG que supera 30 KB. Optimizala antes de guardar.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/content/questions')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || heavySvg}>
            {mode === 'create' ? <PlusIcon className="size-4" /> : <SaveIcon className="size-4" />}
            {mode === 'create' ? 'Crear borrador' : 'Guardar cambios'}
          </Button>
        </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <EyeIcon className="text-info size-4" />
            Vista previa
          </h2>
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <Switch checked={showAnswer} onCheckedChange={setShowAnswer} aria-label="Mostrar respuesta" />
            Ver respuesta
          </label>
        </div>
        <QuestionPreview
          text={values.text}
          options={values.options}
          correctOptionId={values.correctOptionId}
          showAnswer={showAnswer}
          explanation={values.explanation}
        />
      </div>
    </div>
  );
}
