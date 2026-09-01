'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { EyeIcon, LayersIcon, NewspaperIcon, PlusIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { useModulesTree } from '@/hooks/use-modules-tree';
import type { NewsDetail } from '@/hooks/use-news';
import { MarkdownEditor } from './markdown-editor';
import {
  NEWS_TITLE_MAX,
  NewsFormSchema,
  type NewsFormValues,
} from './news-form-model';
import { NewsPreview } from './news-preview';
import { NewsImageUpload } from './news-image-upload';

export function NewsForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: NewsDetail }) {
  const router = useRouter();
  const qc = useQueryClient();

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(NewsFormSchema),
    defaultValues: initial
      ? {
          country: initial.country,
          moduleId: initial.moduleId ?? '',
          title: initial.title,
          summary: initial.summary,
          body: initial.body,
          imageUrl: initial.imageUrl,
        }
      : {
          country: COUNTRIES[0]?.code ?? 'CR',
          moduleId: '',
          title: '',
          summary: '',
          body: '',
          imageUrl: null,
        },
  });
  const values = form.watch();
  const { data: tree } = useModulesTree(values.country);
  const modules = tree ?? [];

  // El schema ya exige módulo (toda noticia va a uno, también al editar) y
  // acota el título a lo que la app pinta sin cortar.
  async function submit(v: NewsFormValues): Promise<void> {
    const url = mode === 'create' ? '/api/admin/content/news' : `/api/admin/content/news/${initial?.id}`;
    const payload =
      mode === 'create'
        ? {
            country: v.country,
            moduleId: v.moduleId,
            title: v.title,
            summary: v.summary,
            body: v.body,
            imageUrl: v.imageUrl,
            status: 'draft',
          }
        : {
            moduleId: v.moduleId,
            title: v.title,
            summary: v.summary,
            body: v.body,
            imageUrl: v.imageUrl,
          };
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { message?: string };
      toast.error(b.message ?? 'Error guardando la noticia');
      return;
    }
    toast.success(mode === 'create' ? 'Noticia creada como borrador' : 'Noticia actualizada');
    qc.invalidateQueries({ queryKey: ['news'] });
    if (initial) qc.invalidateQueries({ queryKey: ['news-article', initial.id] });
    router.push('/content/news');
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
            {/* El módulo también se edita: la migración dejó 6 noticias en
                borrador sin módulo para que alguien se lo asigne, y si el campo
                solo existiera al crear, guardar fallaba en silencio sobre un
                campo invisible. El país sí queda fijo tras crear. */}
            <fieldset className="min-w-0 space-y-3">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <LayersIcon className="text-primary size-4" />
                Clasificación
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mode === 'create' && (
            <Controller
              name="country"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>País</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue('moduleId', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} · {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
                )}
            <Controller
              name="moduleId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Módulo</FieldLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Elegí el módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.shortName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      A quién le llega la noticia.
                    </p>
                  )}
                </Field>
              )}
            />
              </div>
            </fieldset>

            <fieldset className="min-w-0 space-y-4">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <NewspaperIcon className="text-primary size-4" />
                Contenido
              </legend>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => {
            const used = field.value.trim().length;
            return (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-baseline justify-between gap-2">
                  <FieldLabel htmlFor="n-title">Título</FieldLabel>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      used > NEWS_TITLE_MAX
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                    )}
                    aria-live="polite"
                  >
                    {used}/{NEWS_TITLE_MAX}
                  </span>
                </div>
                <Input {...field} id="n-title" aria-invalid={fieldState.invalid} />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Corto y directo: más largo se cortaría con “…” en la app.
                  </p>
                )}
              </Field>
            );
          }}
        />

        <Controller
          name="summary"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="n-summary">Resumen</FieldLabel>
              <Textarea {...field} id="n-summary" rows={2} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="body"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Cuerpo (Markdown)</FieldLabel>
              <MarkdownEditor value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />

        <Controller
          name="imageUrl"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Imagen</FieldLabel>
              <NewsImageUpload value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/content/news')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {mode === 'create' ? (
                  <PlusIcon className="size-4" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                {mode === 'create' ? 'Crear borrador' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <EyeIcon className="text-info size-4" />
          Vista previa
        </h2>
        <NewsPreview
          moduleName={
            modules.find((m) => m.id === values.moduleId)?.shortName ?? null
          }
          title={values.title}
          summary={values.summary}
          body={values.body}
          imageUrl={values.imageUrl}
        />
      </div>
    </div>
  );
}
